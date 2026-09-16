const express = require("express");
const bcrypt = require("bcrypt");

const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const {
    createAndSendPasswordResetOtp,
    verifyOtpCode,
    clearOtp
} = require("../services/otpService");

const router = express.Router();

const BCRYPT_ROUNDS = 12;
const DOCUMENT_RESET_OTP_PURPOSE = "password_reset";

// =====================================================
// PASSWORD VALIDATION
// =====================================================

function validatePassword(password) {
    if (typeof password !== "string") {
        return "Document password is required.";
    }

    if (password.length < 8) {
        return "Document password must be at least 8 characters.";
    }

    if (password.length > 128) {
        return "Document password must not exceed 128 characters.";
    }

    return null;
}

// =====================================================
// EMAIL MASKING
// =====================================================

function maskEmail(email) {
    if (typeof email !== "string") {
        return "";
    }

    const cleanEmail = email.trim().toLowerCase();

    const atIndex = cleanEmail.indexOf("@");

    if (atIndex <= 0) {
        return "";
    }

    const localPart = cleanEmail.substring(0, atIndex);
    const domainPart = cleanEmail.substring(atIndex);

    if (localPart.length === 1) {
        return `*${domainPart}`;
    }

    if (localPart.length === 2) {
        return `${localPart[0]}*${domainPart}`;
    }

    return `${localPart[0]}${"*".repeat(
        Math.min(localPart.length - 2, 6)
    )}${localPart[localPart.length - 1]}${domainPart}`;
}

// =====================================================
// GET DOCUMENT SECURITY STATUS
// =====================================================
// Checks whether the authenticated user has created
// a Document Security Password.
//
// IMPORTANT:
// The user ID comes from the verified JWT.
// We do NOT accept userId from the browser.
// =====================================================

router.get(
    "/status",
    authMiddleware,
    async (req, res) => {
        try {
            const userId = Number(req.user.id);

            if (!Number.isInteger(userId) || userId <= 0) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid authenticated user."
                });
            }

            const [rows] = await db.query(
                `
                SELECT id
                FROM document_security
                WHERE user_id = ?
                LIMIT 1
                `,
                [userId]
            );

            return res.json({
                success: true,
                hasPassword: rows.length > 0
            });

        } catch (error) {
            console.error(
                "DOCUMENT SECURITY STATUS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to check document security status."
            });
        }
    }
);

// =====================================================
// SET DOCUMENT SECURITY PASSWORD
// =====================================================
// Used when a user does not have a Document Password.
//
// The actual password is NEVER stored.
// Only the bcrypt hash is stored.
// =====================================================

router.post(
    "/set-password",
    authMiddleware,
    async (req, res) => {
        try {
            const userId = Number(req.user.id);

            const {
                password,
                confirmPassword
            } = req.body;

            if (!Number.isInteger(userId) || userId <= 0) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid authenticated user."
                });
            }

            const validationError =
                validatePassword(password);

            if (validationError) {
                return res.status(400).json({
                    success: false,
                    message: validationError
                });
            }

            if (password !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Document passwords do not match."
                });
            }

            // Check whether the user already has a password.
            const [existing] = await db.query(
                `
                SELECT id
                FROM document_security
                WHERE user_id = ?
                LIMIT 1
                `,
                [userId]
            );

            if (existing.length > 0) {
                return res.status(409).json({
                    success: false,
                    message:
                        "Document Security Password already exists. Use the change or reset option."
                });
            }

            // Hash the password.
            const passwordHash =
                await bcrypt.hash(
                    password,
                    BCRYPT_ROUNDS
                );

            await db.query(
                `
                INSERT INTO document_security
                (
                    user_id,
                    password_hash
                )
                VALUES (?, ?)
                `,
                [
                    userId,
                    passwordHash
                ]
            );

            return res.status(201).json({
                success: true,
                message:
                    "Document Security Password created successfully."
            });

        } catch (error) {
            console.error(
                "SET DOCUMENT SECURITY PASSWORD ERROR:",
                error
            );

            if (error.code === "ER_DUP_ENTRY") {
                return res.status(409).json({
                    success: false,
                    message:
                        "Document Security Password already exists."
                });
            }

            return res.status(500).json({
                success: false,
                message:
                    "Unable to create Document Security Password."
            });
        }
    }
);

// =====================================================
// VERIFY DOCUMENT SECURITY PASSWORD
// =====================================================

router.post(
    "/verify-password",
    authMiddleware,
    async (req, res) => {
        try {
            const userId = Number(req.user.id);
            const { password } = req.body;

            if (!Number.isInteger(userId) || userId <= 0) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid authenticated user."
                });
            }

            if (
                typeof password !== "string" ||
                password.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Document Security Password is required."
                });
            }

            const [rows] = await db.query(
                `
                SELECT password_hash
                FROM document_security
                WHERE user_id = ?
                LIMIT 1
                `,
                [userId]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    hasPassword: false,
                    message:
                        "Document Security Password has not been created yet."
                });
            }

            const passwordMatches =
                await bcrypt.compare(
                    password,
                    rows[0].password_hash
                );

            if (!passwordMatches) {
                return res.status(401).json({
                    success: false,
                    verified: false,
                    message:
                        "Incorrect Document Security Password."
                });
            }

            return res.json({
                success: true,
                verified: true,
                message:
                    "Document Security Password verified."
            });

        } catch (error) {
            console.error(
                "VERIFY DOCUMENT SECURITY PASSWORD ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to verify Document Security Password."
            });
        }
    }
);

// =====================================================
// REQUEST DOCUMENT SECURITY PASSWORD RESET
// =====================================================
// Sends a reset OTP to the authenticated user's
// registered email address.
//
// SECURITY:
// - User ID comes from JWT.
// - Email is taken from database.
// - Browser cannot provide another user's email.
// - OTP is handled by the existing OTP service.
// =====================================================

router.post(
    "/request-reset",
    authMiddleware,
    async (req, res) => {
        try {
            const userId = Number(req.user.id);

            if (!Number.isInteger(userId) || userId <= 0) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid authenticated user."
                });
            }

            // Get the authenticated user's email and role.
            const [users] = await db.query(
                `
                SELECT
                    id,
                    email,
                    role
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User account not found."
                });
            }

            const user = users[0];

            const email =
                typeof user.email === "string"
                    ? user.email.trim().toLowerCase()
                    : "";

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message:
                        "No registered email address is available for this account."
                });
            }

            // Make sure the Document Security Password exists.
            const [securityRows] = await db.query(
                `
                SELECT id
                FROM document_security
                WHERE user_id = ?
                LIMIT 1
                `,
                [userId]
            );

            if (securityRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Document Security Password has not been created yet."
                });
            }

            // Reuse the existing NyayaAI password-reset OTP system.
            const result =
                await createAndSendPasswordResetOtp(
                    email,
                    user.role || "citizen"
                );

            return res.json({
                success: true,
                message:
                    "A Document Security Password reset code has been sent to your registered email.",
                emailMasked: maskEmail(email),
                expiresInMinutes:
                    result.expiresInMinutes
            });

        } catch (error) {
            console.error(
                "REQUEST DOCUMENT SECURITY PASSWORD RESET ERROR:",
                error
            );

            if (error.code === "OTP_COOLDOWN") {
                return res.status(429).json({
                    success: false,
                    message:
                        error.message ||
                        "Please wait before requesting another code.",
                    waitSeconds:
                        error.waitSeconds
                });
            }

            return res.status(500).json({
                success: false,
                message:
                    "Unable to send the Document Security Password reset code."
            });
        }
    }
);

// =====================================================
// RESET DOCUMENT SECURITY PASSWORD
// =====================================================
// Verifies the OTP and creates a new Document Security
// Password.
//
// SECURITY:
// - User ID comes from JWT.
// - OTP email is taken from database.
// - Password is bcrypt hashed.
// - OTP is cleared after successful reset.
// - Plain password is never stored.
// =====================================================

router.post(
    "/reset-password",
    authMiddleware,
    async (req, res) => {
        try {
            const userId = Number(req.user.id);

            const {
                code,
                password,
                confirmPassword
            } = req.body;

            if (!Number.isInteger(userId) || userId <= 0) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid authenticated user."
                });
            }

            // =================================================
            // VALIDATE RESET CODE
            // =================================================

            if (
                typeof code !== "string" ||
                code.trim().length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Verification code is required."
                });
            }

            // =================================================
            // VALIDATE NEW PASSWORD
            // =================================================

            const validationError =
                validatePassword(password);

            if (validationError) {
                return res.status(400).json({
                    success: false,
                    message: validationError
                });
            }

            if (password !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message:
                        "New Document Security Passwords do not match."
                });
            }

            // =================================================
            // GET AUTHENTICATED USER EMAIL
            // =================================================

            const [users] = await db.query(
                `
                SELECT
                    id,
                    email
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [userId]
            );

            if (users.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User account not found."
                });
            }

            const email =
                typeof users[0].email === "string"
                    ? users[0].email.trim().toLowerCase()
                    : "";

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message:
                        "No registered email address is available for this account."
                });
            }

            // =================================================
            // VERIFY OTP
            // =================================================

            try {
                await verifyOtpCode(
                    email,
                    DOCUMENT_RESET_OTP_PURPOSE,
                    code.trim()
                );
            } catch (otpError) {
                console.error(
                    "DOCUMENT PASSWORD RESET OTP ERROR:",
                    otpError
                );

                const otpStatusMap = {
                    OTP_NOT_FOUND: 400,
                    OTP_LOCKED: 429,
                    OTP_EXPIRED: 400,
                    OTP_INCORRECT: 400
                };

                const status =
                    otpStatusMap[otpError.code] || 400;

                return res.status(status).json({
                    success: false,
                    message:
                        otpError.message ||
                        "Invalid verification code."
                });
            }

            // =================================================
            // HASH NEW DOCUMENT PASSWORD
            // =================================================

            const passwordHash =
                await bcrypt.hash(
                    password,
                    BCRYPT_ROUNDS
                );

            // =================================================
            // UPDATE DOCUMENT SECURITY PASSWORD
            // =================================================

            const [updateResult] = await db.query(
                `
                UPDATE document_security
                SET password_hash = ?
                WHERE user_id = ?
                `,
                [
                    passwordHash,
                    userId
                ]
            );

            if (updateResult.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Document Security Password has not been created yet."
                });
            }

            // =================================================
            // CLEAR USED OTP
            // =================================================

            try {
                await clearOtp(
                    email,
                    DOCUMENT_RESET_OTP_PURPOSE
                );
            } catch (clearError) {
                // Password reset already succeeded.
                // Log cleanup failure but don't report
                // the reset as failed.
                console.error(
                    "CLEAR DOCUMENT PASSWORD RESET OTP ERROR:",
                    clearError
                );
            }

            return res.json({
                success: true,
                message:
                    "Document Security Password reset successfully."
            });

        } catch (error) {
            console.error(
                "RESET DOCUMENT SECURITY PASSWORD ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to reset Document Security Password."
            });
        }
    }
);

// =====================================================
// CHANGE DOCUMENT SECURITY PASSWORD
// =====================================================
// Used when the user knows their current password.
// =====================================================

router.post(
    "/change-password",
    authMiddleware,
    async (req, res) => {
        try {
            const userId = Number(req.user.id);

            const {
                currentPassword,
                newPassword,
                confirmPassword
            } = req.body;

            if (!Number.isInteger(userId) || userId <= 0) {
                return res.status(401).json({
                    success: false,
                    message: "Invalid authenticated user."
                });
            }

            if (
                typeof currentPassword !== "string" ||
                currentPassword.length === 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Current Document Security Password is required."
                });
            }

            const validationError =
                validatePassword(newPassword);

            if (validationError) {
                return res.status(400).json({
                    success: false,
                    message: validationError
                });
            }

            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message:
                        "New Document Security Passwords do not match."
                });
            }

            const [rows] = await db.query(
                `
                SELECT
                    id,
                    password_hash
                FROM document_security
                WHERE user_id = ?
                LIMIT 1
                `,
                [userId]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Document Security Password has not been created yet."
                });
            }

            const currentPasswordMatches =
                await bcrypt.compare(
                    currentPassword,
                    rows[0].password_hash
                );

            if (!currentPasswordMatches) {
                return res.status(401).json({
                    success: false,
                    message:
                        "Current Document Security Password is incorrect."
                });
            }

            const newPasswordHash =
                await bcrypt.hash(
                    newPassword,
                    BCRYPT_ROUNDS
                );

            await db.query(
                `
                UPDATE document_security
                SET password_hash = ?
                WHERE user_id = ?
                `,
                [
                    newPasswordHash,
                    userId
                ]
            );

            return res.json({
                success: true,
                message:
                    "Document Security Password changed successfully."
            });

        } catch (error) {
            console.error(
                "CHANGE DOCUMENT SECURITY PASSWORD ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to change Document Security Password."
            });
        }
    }
);

// =====================================================
// EXPORT
// =====================================================

module.exports = router;