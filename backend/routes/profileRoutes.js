const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const rateLimit = require("express-rate-limit");

const {
    createProfilePhotoStoragePath,
    toStorageReference,
    uploadDocumentBuffer,
    downloadDocumentBuffer,
    deleteDocumentFromStorage,
} = require("../services/supabaseStorageService");

const {
    MAX_PHOTO_BYTES,
    buildProfilePhotoUrl,
    validateProfilePhotoBuffer,
} = require("../utils/profilePhoto");

const router = express.Router();

// =====================================================
// GET CURRENT PROFILE
// GET /api/profile
// =====================================================

router.get("/", authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(
            `
            SELECT
                u.id,
                u.full_name,
                u.email,
                u.phone,
                u.role,

                l.specialization,
                l.experience,
                l.location,
                l.bio,
                l.verified,
                l.bar_council_no,
                l.high_court,
                l.enrollment_year,

                u.profile_photo_path

            FROM users u
            LEFT JOIN lawyers l
                ON l.user_id = u.id
            WHERE u.id = ?
            LIMIT 1
            `,
            [req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const user = rows[0];

        res.json({
            success: true,
            user: {
                id: user.id,
                fullName: user.full_name,
                email: user.email,
                phone: user.phone || "",
                role: user.role,

                city: user.location || "",
                bio: user.bio || "",

                practiceAreas: user.specialization
                    ? String(user.specialization)
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean)
                    : [],

                specialization: user.specialization || "",
                experience: user.experience || 0,
                verified: Boolean(user.verified),

                barCouncilNo: user.bar_council_no || "",
                highCourt: user.high_court || "",
                enrollmentYear:
                    user.enrollment_year != null
                        ? String(user.enrollment_year)
                        : "",

                photoUrl: buildProfilePhotoUrl(
                    user.id,
                    user.profile_photo_path
                ),
            },
        });
    } catch (err) {
        console.error("GET PROFILE ERROR:", err);

        res.status(500).json({
            success: false,
            message:
                err.message || "Failed to load profile",
        });
    }
});


// =====================================================
// UPDATE CURRENT PROFILE
// PUT /api/profile
// =====================================================

router.put("/", authMiddleware, async (req, res) => {
    try {
        const {
            fullName,
            email,
            phone,
            city,
            bio,
            barCouncilNo,
            practiceAreas,
            highCourt,
            enrollmentYear,
        } = req.body;

        if (!fullName || !String(fullName).trim()) {
            return res.status(400).json({
                success: false,
                message: "Full name is required.",
            });
        }

        if (!email || !String(email).trim()) {
            return res.status(400).json({
                success: false,
                message: "Email is required.",
            });
        }

        const cleanName = String(fullName).trim();
        const cleanEmail = String(email).trim();
        const cleanPhone = phone
            ? String(phone).trim()
            : "";

        const cleanCity = city
            ? String(city).trim()
            : "";

        const cleanBio = bio
            ? String(bio).trim()
            : "";

        const existingUserResult = await db.query(
            `
            SELECT id
            FROM users
            WHERE email = ?
            LIMIT 1
            `,
            [cleanEmail]
        );

        const existingUser =
            existingUserResult[0][0];

        if (
            existingUser &&
            Number(existingUser.id) !==
                Number(req.user.id)
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "This email is already registered by another user.",
            });
        }

        // ---------------------------------------------
        // UPDATE USERS TABLE
        // ---------------------------------------------

        await db.query(
            `
            UPDATE users
            SET
                full_name = ?,
                email = ?,
                phone = ?
            WHERE id = ?
            `,
            [
                cleanName,
                cleanEmail,
                cleanPhone,
                req.user.id,
            ]
        );

        // ---------------------------------------------
        // ADVOCATE-SPECIFIC PROFILE
        // ---------------------------------------------

        if (
            String(req.user.role).toLowerCase() ===
            "lawyer"
        ) {
            const areas = Array.isArray(practiceAreas)
                ? practiceAreas
                    .map((item) => String(item).trim())
                    .filter(Boolean)
                : [];

            const specialization =
                areas.join(", ");

            const year =
                enrollmentYear &&
                /^\d{4}$/.test(
                    String(enrollmentYear).trim()
                )
                    ? Number(
                        String(enrollmentYear).trim()
                    )
                    : null;

            const [lawyerRows] = await db.query(
                `
                SELECT id
                FROM lawyers
                WHERE user_id = ?
                LIMIT 1
                `,
                [req.user.id]
            );

            if (lawyerRows.length) {
                await db.query(
                    `
                    UPDATE lawyers
                    SET
                        specialization = ?,
                        location = ?,
                        bio = ?,
                        bar_council_no = ?,
                        high_court = ?,
                        enrollment_year = ?
                    WHERE user_id = ?
                    `,
                    [
                        specialization,
                        cleanCity,
                        cleanBio,
                        barCouncilNo
                            ? String(barCouncilNo).trim()
                            : "",
                        highCourt
                            ? String(highCourt).trim()
                            : "",
                        year,
                        req.user.id,
                    ]
                );
            } else {
                await db.query(
                    `
                    INSERT INTO lawyers
                    (
                        user_id,
                        specialization,
                        experience,
                        location,
                        bio,
                        verified,
                        bar_council_no,
                        high_court,
                        enrollment_year
                    )
                    VALUES (?, ?, 0, ?, ?, 0, ?, ?, ?)
                    `,
                    [
                        req.user.id,
                        specialization,
                        cleanCity,
                        cleanBio,
                        barCouncilNo
                            ? String(barCouncilNo).trim()
                            : "",
                        highCourt
                            ? String(highCourt).trim()
                            : "",
                        year,
                    ]
                );
            }
        }

        // ---------------------------------------------
        // RETURN FRESH PROFILE
        // ---------------------------------------------

        const [rows] = await db.query(
            `
            SELECT
                u.id,
                u.full_name,
                u.email,
                u.phone,
                u.role,

                l.specialization,
                l.experience,
                l.location,
                l.bio,
                l.verified,
                l.bar_council_no,
                l.high_court,
                l.enrollment_year,

                u.profile_photo_path

            FROM users u
            LEFT JOIN lawyers l
                ON l.user_id = u.id
            WHERE u.id = ?
            LIMIT 1
            `,
            [req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message:
                    "Profile was updated but could not be reloaded.",
            });
        }

        const user = rows[0];

        res.json({
            success: true,
            message: "Profile updated successfully.",
            user: {
                id: user.id,
                fullName: user.full_name,
                email: user.email,
                phone: user.phone || "",
                role: user.role,

                city: user.location || "",
                bio: user.bio || "",

                practiceAreas: user.specialization
                    ? String(user.specialization)
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean)
                    : [],

                specialization: user.specialization || "",
                experience: user.experience || 0,
                verified: Boolean(user.verified),

                barCouncilNo:
                    user.bar_council_no || "",

                highCourt:
                    user.high_court || "",

                enrollmentYear:
                    user.enrollment_year != null
                        ? String(user.enrollment_year)
                        : "",

                photoUrl: buildProfilePhotoUrl(
                    user.id,
                    user.profile_photo_path
                ),
            },
        });
    } catch (err) {
        console.error("UPDATE PROFILE ERROR:", err);

        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message:
                    "This email is already registered.",
            });
        }

        res.status(500).json({
            success: false,
            message:
                err.message ||
                "Failed to update profile",
        });
    }
});


// =====================================================
// PROFILE PHOTO
// =====================================================
//
// The photo bytes live in the existing private Supabase
// Storage bucket (profile-photos/<userId>/<uuid>.jpg).
// Only the storage reference is stored in the database
// (users.profile_photo_path). The browser never receives
// the storage path or any storage credentials; it loads the
// image through GET /api/profile/photo/:userId below.
// =====================================================

const photoUpload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_PHOTO_BYTES,
        files: 1,
        fields: 0,
    },
    fileFilter(req, file, cb) {
        if (file.mimetype !== "image/jpeg") {
            const error = new Error(
                "Photo must be a JPEG image captured from the camera."
            );
            error.code = "INVALID_PHOTO_TYPE";
            return cb(error);
        }

        cb(null, true);
    },
});

// Per-user limit so the endpoint cannot be used to burn
// storage or bandwidth. Runs after authMiddleware.
const photoUploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `profile-photo:${req.user.id}`,
    message: {
        success: false,
        message:
            "Too many photo uploads. Please try again in a few minutes.",
    },
});

function handlePhotoUpload(req, res, next) {
    photoUpload.single("photo")(req, res, (error) => {
        if (!error) {
            return next();
        }

        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
                success: false,
                message: "Photo is too large. Maximum size is 2 MB.",
            });
        }

        return res.status(400).json({
            success: false,
            message:
                error.code === "INVALID_PHOTO_TYPE"
                    ? error.message
                    : "Invalid photo upload.",
        });
    });
}

// =====================================================
// UPLOAD / REPLACE PROFILE PHOTO
// PUT /api/profile/photo   (multipart/form-data, field "photo")
//
// Always acts on the authenticated user (req.user.id from the
// verified JWT). No user id is accepted from the client, so a
// user cannot change anybody else's photo. Only
// users.profile_photo_path is written, so advocate
// verification and all other profile fields are untouched.
// =====================================================

// Maps a failure in the photo-save pipeline to a safe, useful
// response. Only the failing stage and an upstream HTTP status
// are used; storage bodies, keys and URLs are never sent to the
// client (the full error is logged server-side only).
function describePhotoFailure(stage, err) {
    const message = String((err && err.message) || "");

    if (stage === "storage") {
        if (/not configured/i.test(message)) {
            return {
                status: 503,
                code: "PHOTO_STORAGE_NOT_CONFIGURED",
                message:
                    "Photo storage is not configured on the server. Please contact support.",
            };
        }

        const match = message.match(/upload failed \((\d{3})\)/i);
        const upstream = match ? Number(match[1]) : null;

        if (upstream === 401 || upstream === 403) {
            return {
                status: 502,
                code: "PHOTO_STORAGE_AUTH_FAILED",
                message:
                    "The server's photo storage credentials were rejected. Please contact support.",
            };
        }

        if (upstream === 415) {
            return {
                status: 502,
                code: "PHOTO_STORAGE_TYPE_REJECTED",
                message:
                    "Photo storage does not accept JPEG images. Please contact support.",
            };
        }

        if (upstream === 413) {
            return {
                status: 502,
                code: "PHOTO_STORAGE_TOO_LARGE",
                message:
                    "Photo storage rejected the file size. Please contact support.",
            };
        }

        if (upstream === 400 || upstream === 404) {
            return {
                status: 502,
                code: "PHOTO_STORAGE_BUCKET_ERROR",
                message:
                    "Photo storage is not set up correctly. Please contact support.",
            };
        }

        return {
            status: 502,
            code: "PHOTO_STORAGE_UNAVAILABLE",
            message:
                "Photo storage is temporarily unavailable. Please try again.",
        };
    }

    if (stage === "database") {
        if (err && err.code === "ER_BAD_FIELD_ERROR") {
            return {
                status: 500,
                code: "PHOTO_DB_COLUMN_MISSING",
                message:
                    "Profile photos are not set up in the database yet. Please contact support.",
            };
        }

        return {
            status: 500,
            code: "PHOTO_DB_UPDATE_FAILED",
            message:
                "Your photo was uploaded but could not be linked to your profile. Please try again.",
        };
    }

    return {
        status: 500,
        code: "PHOTO_SAVE_FAILED",
        message: "Failed to save profile photo. Please try again.",
    };
}

router.put(
    "/photo",
    authMiddleware,
    photoUploadLimiter,
    handlePhotoUpload,
    async (req, res) => {
        let uploadedReference = null;
        let stage = "validate";

        try {
            const validation = validateProfilePhotoBuffer(
                req.file && req.file.buffer
            );

            if (!validation.ok) {
                return res.status(validation.status || 400).json({
                    success: false,
                    message: validation.message,
                });
            }

            stage = "lookup";

            const [existingRows] = await db.query(
                `
                SELECT id, profile_photo_path
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [req.user.id]
            );

            if (!existingRows.length) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }

            const previousReference =
                existingRows[0].profile_photo_path || null;

            const objectPath = createProfilePhotoStoragePath(
                req.user.id
            );

            stage = "storage";

            await uploadDocumentBuffer(
                req.file.buffer,
                objectPath,
                "image/jpeg"
            );

            uploadedReference = toStorageReference(objectPath);

            stage = "database";

            await db.query(
                `
                UPDATE users
                SET profile_photo_path = ?
                WHERE id = ?
                `,
                [uploadedReference, req.user.id]
            );

            // The new photo is now the source of truth.
            uploadedReference = null;

            stage = "response";

            // Best-effort cleanup of the replaced photo.
            if (previousReference) {
                deleteDocumentFromStorage(previousReference).catch(
                    (cleanupError) => {
                        console.warn(
                            "OLD PROFILE PHOTO CLEANUP FAILED:",
                            cleanupError.message
                        );
                    }
                );
            }

            const [rows] = await db.query(
                `
                SELECT
                    u.id,
                    u.full_name,
                    u.email,
                    u.phone,
                    u.role,

                    l.specialization,
                    l.experience,
                    l.location,
                    l.bio,
                    l.verified,
                    l.bar_council_no,
                    l.high_court,
                    l.enrollment_year,

                    u.profile_photo_path

                FROM users u
                LEFT JOIN lawyers l
                    ON l.user_id = u.id
                WHERE u.id = ?
                LIMIT 1
                `,
                [req.user.id]
            );

            const user = rows[0];

            res.json({
                success: true,
                message: "Profile photo saved successfully.",
                photoUrl: buildProfilePhotoUrl(
                    user.id,
                    user.profile_photo_path
                ),
                user: {
                    id: user.id,
                    fullName: user.full_name,
                    email: user.email,
                    phone: user.phone || "",
                    role: user.role,

                    city: user.location || "",
                    bio: user.bio || "",

                    practiceAreas: user.specialization
                        ? String(user.specialization)
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean)
                        : [],

                    specialization: user.specialization || "",
                    experience: user.experience || 0,
                    verified: Boolean(user.verified),

                    barCouncilNo: user.bar_council_no || "",
                    highCourt: user.high_court || "",
                    enrollmentYear:
                        user.enrollment_year != null
                            ? String(user.enrollment_year)
                            : "",

                    photoUrl: buildProfilePhotoUrl(
                        user.id,
                        user.profile_photo_path
                    ),
                },
            });
        } catch (err) {
            console.error(
                `UPLOAD PROFILE PHOTO ERROR (stage: ${stage}):`,
                err
            );

            // Do not leave an orphaned object behind when the
            // database update did not complete.
            if (uploadedReference) {
                deleteDocumentFromStorage(uploadedReference).catch(
                    () => {}
                );
            }

            const failure = describePhotoFailure(stage, err);

            res.status(failure.status).json({
                success: false,
                code: failure.code,
                message: failure.message,
            });
        }
    }
);

// =====================================================
// REMOVE PROFILE PHOTO
// DELETE /api/profile/photo
//
// Only the authenticated user's own photo can be removed (the
// id comes from the auth cookie, never from the request).
// The storage object is deleted first, so a storage failure
// leaves the current photo untouched; then the database
// reference is cleared.
// =====================================================

router.delete(
    "/photo",
    authMiddleware,
    photoUploadLimiter,
    async (req, res) => {
        try {
            const [rows] = await db.query(
                `
                SELECT id, profile_photo_path
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [req.user.id]
            );

            if (!rows.length) {
                return res.status(404).json({
                    success: false,
                    message: "User not found",
                });
            }

            const reference = rows[0].profile_photo_path || null;

            if (reference) {
                await deleteDocumentFromStorage(reference);

                await db.query(
                    `
                    UPDATE users
                    SET profile_photo_path = NULL
                    WHERE id = ?
                    `,
                    [req.user.id]
                );
            }

            res.json({
                success: true,
                message: "Profile photo removed successfully.",
                photoUrl: "",
            });
        } catch (err) {
            console.error("REMOVE PROFILE PHOTO ERROR:", err);

            res.status(500).json({
                success: false,
                message:
                    "Failed to remove profile photo. Your current photo was kept. Please try again.",
            });
        }
    }
);

// =====================================================
// SERVE A PROFILE PHOTO
// GET /api/profile/photo/:userId
//
// - Advocate photos are public (they are shown on the public
//   Find Advocates listing).
// - Any other account's photo (citizens) is private: only the
//   authenticated owner can load it.
// =====================================================

async function sendPhoto(res, row, requestedVersion, isPublic) {
    try {
        const buffer = await downloadDocumentBuffer(
            row.profile_photo_path
        );

        const currentUrl = buildProfilePhotoUrl(
            row.id,
            row.profile_photo_path
        );

        const versionMatches =
            requestedVersion &&
            currentUrl &&
            currentUrl.endsWith(`?v=${requestedVersion}`);

        res.set({
            "Content-Type": "image/jpeg",
            "Content-Length": buffer.length,
            "Cache-Control": isPublic
                ? versionMatches
                    ? "public, max-age=86400"
                    : "public, max-age=60"
                : "private, max-age=300",
        });

        return res.send(buffer);
    } catch (err) {
        if (err.code === "STORAGE_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: "Photo not found",
            });
        }

        console.error("SERVE PROFILE PHOTO ERROR:", err);

        return res.status(500).json({
            success: false,
            message: "Failed to load photo",
        });
    }
}

router.get("/photo/:userId", async (req, res) => {
    try {
        const targetId = Number(req.params.userId);

        if (!Number.isInteger(targetId) || targetId <= 0) {
            return res.status(404).json({
                success: false,
                message: "Photo not found",
            });
        }

        const [rows] = await db.query(
            `
            SELECT id, role, profile_photo_path
            FROM users
            WHERE id = ?
            LIMIT 1
            `,
            [targetId]
        );

        const row = rows[0];

        if (!row || !row.profile_photo_path) {
            return res.status(404).json({
                success: false,
                message: "Photo not found",
            });
        }

        const requestedVersion = String(req.query.v || "");

        if (String(row.role).toLowerCase() === "lawyer") {
            return sendPhoto(res, row, requestedVersion, true);
        }

        // Private account: require login and ownership.
        return authMiddleware(req, res, () => {
            if (Number(req.user.id) !== Number(row.id)) {
                return res.status(404).json({
                    success: false,
                    message: "Photo not found",
                });
            }

            return sendPhoto(res, row, requestedVersion, false);
        });
    } catch (err) {
        console.error("GET PROFILE PHOTO ERROR:", err);

        res.status(500).json({
            success: false,
            message: "Failed to load photo",
        });
    }
});

module.exports = router;
