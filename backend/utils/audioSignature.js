// =====================================================
// AUDIO FILE-SIGNATURE VALIDATION
// (Voice/STT hardening — Part 2)
// =====================================================
//
// multer's fileFilter (see routes/voiceRoutes.js) only looks at the
// multipart Content-Type the CLIENT reported for the "audio" field.
// That value is fully attacker-controlled: a request can attach any
// bytes at all and simply declare them "audio/webm". This module
// inspects the actual leading bytes of the upload (its container
// "magic numbers") and confirms they match a real, known audio
// format — regardless of what the request claimed.
//
// Scope is intentionally narrow: the app's only real STT audio path
// (src/pages/AIAssistant.tsx, MediaRecorder) always produces a
// "audio/webm" Blob named "recording.webm". The other MIME types in
// ALLOWED_AUDIO_MIME_TYPES (ogg/wav/mpeg/mp4/m4a) exist as a slightly
// wider allowlist for other/future clients, so they get real
// signature checks too — but none of these detectors were invented;
// each is a well-documented container/format magic number.

function matchesBytes(buffer, signature, offset = 0) {
    if (!buffer || buffer.length < offset + signature.length) {
        return false;
    }
    for (let i = 0; i < signature.length; i++) {
        if (buffer[offset + i] !== signature[i]) {
            return false;
        }
    }
    return true;
}

function isWebm(buffer) {
    // EBML header: 1A 45 DF A3. Shared by every Matroska/WebM file —
    // audio-only WebM (what the browser records) and video WebM both
    // start with this, so this correctly accepts what the app sends.
    return matchesBytes(buffer, [0x1a, 0x45, 0xdf, 0xa3]);
}

function isOgg(buffer) {
    // "OggS"
    return matchesBytes(buffer, [0x4f, 0x67, 0x67, 0x53]);
}

function isWav(buffer) {
    // RIFF....WAVE — check both the outer RIFF chunk and the WAVE
    // form type (offset 8) so a non-WAV RIFF file (e.g. WEBP/AVI)
    // isn't accepted just because it starts with "RIFF".
    return (
        matchesBytes(buffer, [0x52, 0x49, 0x46, 0x46]) && // RIFF
        matchesBytes(buffer, [0x57, 0x41, 0x56, 0x45], 8) // WAVE
    );
}

function isMp3(buffer) {
    if (matchesBytes(buffer, [0x49, 0x44, 0x33])) return true; // ID3v2 tag
    // Bare MPEG frame sync (no ID3 tag): 11 sync bits set, then
    // MPEG version + Layer bits that correspond to MP3 (Layer III).
    if (buffer && buffer.length >= 2 && buffer[0] === 0xff) {
        const b1 = buffer[1];
        // 0xFB/0xF3/0xF2/0xFA/0xE3/0xE2 cover MPEG-1/2 Layer III sync bytes
        return (b1 & 0xe0) === 0xe0 && ((b1 >> 1) & 0x03) === 0x01;
    }
    return false;
}

function isMp4Family(buffer) {
    // ISO base media container (MP4/M4A/MOV/3GP all share this):
    // bytes 4-7 spell "ftyp".
    return matchesBytes(buffer, [0x66, 0x74, 0x79, 0x70], 4);
}

const DETECTORS_BY_MIME_TYPE = {
    "audio/webm": isWebm,
    "audio/ogg": isOgg,
    "audio/wav": isWav,
    "audio/x-wav": isWav,
    "audio/mpeg": isMp3,
    "audio/mp4": isMp4Family,
    "audio/m4a": isMp4Family,
};

/**
 * Returns true only if `buffer`'s actual leading bytes match a real,
 * known audio-format signature for the *claimed* mimetype. A file
 * whose bytes don't correspond to any known audio container (or that
 * matches a different one than it claims) returns false.
 */
function audioSignatureMatchesMimeType(buffer, mimetype) {
    const detector = DETECTORS_BY_MIME_TYPE[mimetype];
    if (!detector) {
        return false;
    }
    try {
        return detector(buffer);
    } catch {
        return false;
    }
}

/**
 * Convenience check used for the reject-on-any-mismatch path: true if
 * the buffer's bytes match ANY of our known audio signatures at all,
 * regardless of the claimed mimetype. Used only for diagnostics.
 */
function detectAudioFormat(buffer) {
    for (const [mime, detector] of Object.entries(DETECTORS_BY_MIME_TYPE)) {
        try {
            if (detector(buffer)) return mime;
        } catch {
            // ignore and keep scanning
        }
    }
    return null;
}

module.exports = {
    audioSignatureMatchesMimeType,
    detectAudioFormat,
    // exported for unit testing only
    _internal: { isWebm, isOgg, isWav, isMp3, isMp4Family, matchesBytes },
};
