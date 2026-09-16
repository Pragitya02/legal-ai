const express = require("express");
const multer = require("multer");
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { speechToText, textToSpeech } = require("../services/sarvamService");
const authMiddleware = require("../middleware/authMiddleware");
const {
    audioSignatureMatchesMimeType,
} = require("../utils/audioSignature");

const router = express.Router();

// --- STT upload hardening (Part 1: size limit + basic audio validation) ---
//
// The frontend (src/pages/AIAssistant.tsx) records audio via MediaRecorder
// and always sends a single Blob named "recording.webm" with type
// "audio/webm" (browser default codec is usually Opus). We keep the
// allowlist scoped to what the app genuinely sends, plus a couple of very
// common audio formats, to avoid breaking legitimate recordings across
// browsers while still rejecting arbitrary/unrelated file types.
const ALLOWED_AUDIO_MIME_TYPES = new Set([
    "audio/webm",
    "audio/ogg",
    "audio/wav",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp4",
    "audio/m4a",
]);

// 25 MB is a safe ceiling: at typical Opus/webm voice-recording bitrates
// (~32-64 kbps) that's well over an hour of audio, far beyond a normal
// STT dictation/voice-note use case, while still bounding how much data
// can be buffered in memory per upload (storage is memoryStorage()).
const MAX_AUDIO_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

// --- Memory protection audit (Part 2) ---
//
// This endpoint intentionally uses multer.memoryStorage() (see Part 1
// comment above) rather than streaming to a temp file, because the
// audio buffer is handed straight to Sarvam as a Blob and nothing on
// this path ever writes it to disk. The risk with memoryStorage() is
// unbounded RAM use if a client can push more bytes than intended.
// That's covered by two multer-enforced limits below:
//   - fileSize: multer aborts the upload stream and discards what it
//     has buffered as soon as MAX_AUDIO_UPLOAD_BYTES is exceeded, so a
//     single request can never buffer more than ~25 MB in memory —
//     it does not read the whole body first and check after.
//   - files: 1 caps the number of buffered files per request, so a
//     multipart body can't smuggle in extra large parts under the
//     same limit.
// Per-request memory is therefore bounded; overall server memory
// still scales with concurrent in-flight requests, which is an
// application-level (rate-limiting/concurrency) concern rather than
// something this endpoint can fix on its own without a broader
// architecture change — out of scope for this pass.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_AUDIO_UPLOAD_BYTES,
        files: 1,
    },
    fileFilter: (req, file, cb) => {
        if (!ALLOWED_AUDIO_MIME_TYPES.has(file.mimetype)) {
            // Reject without throwing — lets us send a clean 400 instead
            // of letting Multer surface an internal error.
            cb(null, false);
            req.sttFileRejectedReason = "unsupported_type";
            return;
        }
        cb(null, true);
    },
});

// Wraps upload.single("audio") so oversized/malformed multipart uploads
// never bubble up as unhandled errors or expose internal error details.
function handleSttUpload(req, res, next) {
    upload.single("audio")(req, res, (err) => {
        if (err) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(413).json({
                    success: false,
                    message: "Audio file is too large. Maximum allowed size is 25 MB.",
                });
            }
            // Any other Multer/multipart parsing error — don't leak details.
            console.error("STT UPLOAD ERROR:", err);
            return res.status(400).json({
                success: false,
                message: "Could not process the uploaded audio file.",
            });
        }
        next();
    });
}

// --- File-signature validation (Part 2) ---
//
// fileFilter above only ever saw the multipart Content-Type the
// CLIENT declared for the "audio" part — a value the client fully
// controls. A request can attach any bytes at all (an executable, a
// script, an arbitrary document) and simply label it "audio/webm" to
// sail through that check. This middleware runs after multer has
// buffered the file and inspects its actual leading bytes (its
// container "magic numbers") against the format it claims to be, so
// a mislabeled/malicious upload is rejected here even though its
// declared MIME type was on the allowlist.
//
// The signatures checked are real, well-known container magic
// numbers (see utils/audioSignature.js) — nothing here is invented,
// and audio/webm (what the app's MediaRecorder actually produces) is
// checked against the standard EBML header so legitimate browser
// recordings are never rejected.
function verifySttFileSignature(req, res, next) {
    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
        // No file, or an empty one — let the route handler below
        // produce the specific "no file" / "empty file" message
        // rather than a generic signature-mismatch one.
        return next();
    }

    if (!audioSignatureMatchesMimeType(req.file.buffer, req.file.mimetype)) {
        return res.status(400).json({
            success: false,
            message:
                "This file's contents do not match a supported audio format and was rejected.",
        });
    }

    next();
}

// --- STT rate limiting (Part 3) ---
//
// The global `/api` limiter in server.js (300 req / 15 min) is sized for
// ordinary application traffic and is shared across every endpoint — it
// isn't tight enough on its own to stop a single user from hammering the
// STT endpoint specifically, since each call here does real work (a paid
// Sarvam transcription call) rather than a cheap DB read.
//
// This limiter runs after `authMiddleware`, so `req.user.id` (the
// verified JWT subject — never a client-supplied value) is available and
// used as the key. That means the limit follows the authenticated user
// across devices/IPs/NATs rather than being trivially shared or evaded
// the way a pure-IP limit would be. The `ipKeyGenerator` fallback (IPv6
// safe) only applies in the defensive case where this middleware were
// ever reached without `req.user` set.
const STT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const STT_RATE_LIMIT_MAX = 20; // STT requests per user per window

const sttRateLimiter = rateLimit({
    windowMs: STT_RATE_LIMIT_WINDOW_MS,
    max: STT_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
        if (req.user && req.user.id) {
            return `stt-user-${req.user.id}`;
        }
        return ipKeyGenerator(req.ip);
    },
    handler: (req, res) => {
        // No stack traces, provider details, or internals — just a
        // generic, safe message, matching the shape of every other
        // error response on this endpoint.
        res.status(429).json({
            success: false,
            message: "Too many speech-to-text requests. Please try again later.",
        });
    },
});

// --- STT concurrency limiting (Part 3) ---
//
// Rate limiting alone caps requests *over time*, but a user could still
// open many STT requests at once (e.g. several browser tabs, or a
// scripted client) and have them all in flight simultaneously, each
// paying for its own Sarvam call at the same moment. This tracks how
// many STT calls are currently in progress per user and rejects new
// ones past a small ceiling.
//
// Deliberately a plain in-memory Map, matching the rest of this app's
// architecture (single Node process, no Redis/shared cache in use
// anywhere else) — no new infrastructure required. It self-cleans: a
// user's entry is deleted entirely once their count returns to 0, so it
// never grows to hold stale/idle users, and every acquire below is
// paired with a release in a `finally` block so a Sarvam error, timeout,
// or thrown exception can never leak a permanently-held slot.
const MAX_CONCURRENT_STT_PER_USER = 3;
const activeSttRequestsByUser = new Map();

function acquireSttSlot(userId) {
    const current = activeSttRequestsByUser.get(userId) || 0;
    if (current >= MAX_CONCURRENT_STT_PER_USER) {
        return false;
    }
    activeSttRequestsByUser.set(userId, current + 1);
    return true;
}

function releaseSttSlot(userId) {
    const current = activeSttRequestsByUser.get(userId) || 0;
    if (current <= 1) {
        activeSttRequestsByUser.delete(userId);
    } else {
        activeSttRequestsByUser.set(userId, current - 1);
    }
}

// POST /api/voice/stt  — audio in, transcript out
router.post(
    "/stt",
    authMiddleware,
    sttRateLimiter,
    handleSttUpload,
    verifySttFileSignature,
    async (req, res) => {
    try {
        if (!req.file) {
            if (req.sttFileRejectedReason === "unsupported_type") {
                return res.status(400).json({
                    success: false,
                    message: "Unsupported audio type. Please record and upload audio only.",
                });
            }
            return res.status(400).json({
                success: false,
                message: "No audio file uploaded",
            });
        }

        if (!req.file.buffer || req.file.buffer.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Uploaded audio file is empty",
            });
        }

        // Concurrency check happens last, right before the Sarvam call —
        // every rejection above (auth, rate limit, upload validation,
        // signature validation) has already returned by this point, so
        // a slot is never reserved (and Sarvam is never reached) for a
        // request that was going to be rejected anyway.
        const userId = req.user.id;
        if (!acquireSttSlot(userId)) {
            return res.status(429).json({
                success: false,
                message:
                    "Too many simultaneous speech-to-text requests. Please wait for your current request to finish.",
            });
        }

        try {
            const languageCode = req.body.language_code || "unknown";

            const result = await speechToText(
                req.file.buffer,
                req.file.originalname || "recording.webm",
                languageCode
            );

            res.json({
                success: true,
                transcript: result.transcript,
                languageCode: result.languageCode,
            });
        } finally {
            // Always released — success, Sarvam error, or thrown
            // exception all reach this same finally block.
            releaseSttSlot(userId);
        }

    } catch (err) {
    // Log server-side only. Never forward err.message to the client:
    // it can carry the raw Sarvam response body (provider internals/
    // status text) or other implementation detail depending on where
    // the failure originated. The client always gets the same
    // generic, safe message regardless of cause.
    console.error("STT ERROR:", err instanceof Error ? err.message : err);
    res.status(500).json({
        success: false,
        message: "Speech-to-text failed. Please try again.",
    });
}
});

// --- TTS rate limiting (Part 4) ---
//
// TTS previously relied only on the shared global `/api` limiter (300
// req / 15 min across the whole app), which does not bound a single
// authenticated user hammering this endpoint specifically — each call
// is a paid Sarvam request, the same abuse concern the STT limiter
// above already addresses. Mirrors the STT limiter's shape (per-user
// key via the verified JWT subject, IP fallback) rather than
// introducing a new pattern or any new infrastructure.
const TTS_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const TTS_RATE_LIMIT_MAX = 30; // TTS requests per user per window

const ttsRateLimiter = rateLimit({
    windowMs: TTS_RATE_LIMIT_WINDOW_MS,
    max: TTS_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req, res) => {
        if (req.user && req.user.id) {
            return `tts-user-${req.user.id}`;
        }
        return ipKeyGenerator(req.ip);
    },
    handler: (req, res) => {
        res.status(429).json({
            success: false,
            message: "Too many text-to-speech requests. Please try again later.",
        });
    },
});

// POST /api/voice/tts  — text in, base64 audio out
router.post("/tts", authMiddleware, ttsRateLimiter, async (req, res) => {
    try {
        const { text, language_code, speaker } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({
                success: false,
                message: "No text provided",
            });
        }

        const audioBase64 = await textToSpeech(
            text,
            language_code || "en-IN",
            speaker
        );

        res.json({
            success: true,
            audio: audioBase64, // base64 WAV — frontend builds a data: URL from this
        });

    } catch (err) {
        console.error("TTS ERROR:", err);
        res.status(500).json({
            success: false,
            message: "Text-to-speech failed",
        });
    }
});

module.exports = router;
