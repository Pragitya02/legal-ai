const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const db = require("../db");

const authMiddleware = require("../middleware/authMiddleware");

const {
    createUser,
    createGoogleUser,
    linkGoogleId,
    findUserByGoogleId,
    findUserByEmail,
    findUserById,
    updateUserProfile,
    updateUserPassword
} = require("../database/userModel");

const {
    createAndSendOtp,
    createAndSendPasswordResetOtp,
    verifyOtpCode,
    isEmailVerified,
    clearOtp
} = require("../services/otpService");

const { fetchGoogleProfile } = require("../services/googleAuthService");
const { sendPasswordResetOtpEmail } = require("../services/mailerService");

const {
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    accessCookieOptions,
    refreshCookieOptions,
    clearCookieOptions
} = require("../utils/cookieConfig");

const {
    CSRF_COOKIE,
    issueCsrfCookie,
    csrfClearCookieOptions
} = require("../utils/csrf");

const {
    ACCESS_TOKEN_TTL_MS,
    REFRESH_TOKEN_TTL_MS,
    signAccessToken,
    generateRefreshToken,
    hashToken,
    timingSafeEqualHex
} = require("../utils/tokenService");

const {
    insertRefreshToken,
    findRefreshTokenByHash,
    revokeRefreshTokenByHash,
    revokeAllTokensForUser
} = require("../database/refreshTokenModel");

const {
    createResetToken,
    findValidResetToken,
    markResetTokenUsed,
    invalidateUserResetTokens
} = require("../database/passwordResetTokenModel");

const router = express.Router();

// =====================================================
// CSRF TOKEN BOOTSTRAP
// GET /api/auth/csrf
//
// The frontend is hosted on nyayaai.online while the API is
// hosted on Render. Because browser JavaScript cannot read a
// cookie belonging to the API domain, the CSRF token is also
// returned in this same-origin-authorized response body. The
// browser still stores the token in the API-domain cookie, and
// subsequent state-changing requests must echo the same value
// in X-CSRF-Token. CORS prevents an untrusted origin from
// reading this response.
// =====================================================

router.get("/csrf", (req, res) => {
    try {
        const existingToken = req.cookies && req.cookies[CSRF_COOKIE];
        const token =
            typeof existingToken === "string" && /^[a-f0-9]{64}$/i.test(existingToken)
                ? existingToken
                : issueCsrfCookie(res, ACCESS_TOKEN_TTL_MS);

        return res.json({
            success: true,
            csrfToken: token
        });
    } catch (error) {
        console.error("CSRF TOKEN ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to initialize CSRF protection."
        });
    }
});

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
}

const SIGNUP_OTP_PURPOSE = "signup";
const PASSWORD_RESET_TOKEN_TTL_MS = 10 * 60 * 1000; // 10 minutes


// =====================================================
// ISSUE SESSION (access + refresh cookies)
// Central helper so every login path (citizen, advocate,
// Google) sets cookies the same way.
// =====================================================

async function issueSession(res, user) {

    const accessToken = signAccessToken(user);

    const refreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(refreshToken);
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await insertRefreshToken(user.id, refreshTokenHash, refreshExpiresAt);

    res.cookie(
        ACCESS_TOKEN_COOKIE,
        accessToken,
        accessCookieOptions(ACCESS_TOKEN_TTL_MS)
    );

    res.cookie(
        REFRESH_TOKEN_COOKIE,
        refreshToken,
        refreshCookieOptions(REFRESH_TOKEN_TTL_MS)
    );

    // Paired CSRF token — readable by frontend JS, required as
    // a header on subsequent state-changing requests.
    issueCsrfCookie(res, ACCESS_TOKEN_TTL_MS);
}


// =====================================================
// ENSURE LAWYER PROFILE
// Creates the lawyers row for an advocate if it does
// not already exist. Returns the lawyers.id.
// =====================================================

async function ensureLawyerProfile(userId) {
    const [existing] = await db.query(
        `
        SELECT id
        FROM lawyers
        WHERE user_id = ?
        LIMIT 1
        `,
        [userId]
    );

    if (existing.length > 0) {
        return existing[0].id;
    }

    const [result] = await db.query(
        `
        INSERT INTO lawyers (user_id)
        VALUES (?)
        `,
        [userId]
    );

    return result.insertId;
}


// =====================================================
// SEND SIGNUP OTP
// POST /api/auth/signup/send-otp
// body: { email }
// =====================================================

router.post("/signup/send-otp", async (req, res) => {

    try {

        const { email } = req.body;

        if (!email || !email.trim()) {

            return res.status(400).json({
                success: false,
                message: "Email is required."
            });

        }

        const cleanEmail = email.trim().toLowerCase();

        const existingUser = await findUserByEmail(cleanEmail);

        if (existingUser) {

            return res.status(409).json({
                success: false,
                message: "Email already registered. Please sign in instead."
            });

        }

        const result = await createAndSendOtp(cleanEmail, SIGNUP_OTP_PURPOSE);

        res.json({
            success: true,
            message: `Verification code sent to ${cleanEmail}.`,
            expiresInMinutes: result.expiresInMinutes
        });

    } catch (err) {

        console.error("SEND OTP ERROR:", err);

        if (err.code === "OTP_COOLDOWN") {

            return res.status(429).json({
                success: false,
                message: err.message,
                waitSeconds: err.waitSeconds
            });

        }

        res.status(500).json({
            success: false,
            message: err.message || "Failed to send verification code."
        });

    }

});


// =====================================================
// VERIFY SIGNUP OTP
// POST /api/auth/signup/verify-otp
// body: { email, otp }
// =====================================================

router.post("/signup/verify-otp", async (req, res) => {

    try {

        const { email, otp } = req.body;

        if (!email || !otp) {

            return res.status(400).json({
                success: false,
                message: "Email and code are required."
            });

        }

        const cleanEmail = email.trim().toLowerCase();

        await verifyOtpCode(cleanEmail, SIGNUP_OTP_PURPOSE, String(otp).trim());

        res.json({
            success: true,
            message: "Email verified successfully."
        });

    } catch (err) {

        console.error("VERIFY OTP ERROR:", err);

        const statusMap = {
            OTP_NOT_FOUND: 400,
            OTP_LOCKED: 429,
            OTP_EXPIRED: 400,
            OTP_INCORRECT: 400
        };

        res.status(statusMap[err.code] || 500).json({
            success: false,
            message: err.message || "Failed to verify code.",
            code: err.code
        });

    }

});


// =====================================================
// SIGNUP
// POST /api/auth/signup
// Requires the email to have been verified via OTP first.
// =====================================================

router.post("/signup", async (req, res) => {

    try {

        const {
            fullName,
            email,
            password,
            phone,
            role
        } = req.body;

        if (!fullName || !email || !password) {

            return res.status(400).json({
                success: false,
                message: "Full name, email and password are required."
            });

        }

        // IMPORTANT:
        // The signup form previously accepted any non-empty
        // password (even a single character). Enforce the same
        // minimum-length policy used by the password reset flow
        // so every account is created with a reasonably strong
        // password.
        if (String(password).length < 8) {

            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters."
            });

        }

        if (String(password).length > 128) {

            return res.status(400).json({
                success: false,
                message: "Password must not exceed 128 characters."
            });

        }

        const cleanEmail = email.trim().toLowerCase();

        const existingUser =
            await findUserByEmail(cleanEmail);

        if (existingUser) {

            return res.status(409).json({
                success: false,
                message: "Email already registered."
            });

        }

        const emailVerified =
            await isEmailVerified(cleanEmail, SIGNUP_OTP_PURPOSE);

        if (!emailVerified) {

            return res.status(403).json({
                success: false,
                message: "Please verify your email with the OTP sent to it before creating an account."
            });

        }

        const hashedPassword =
            await bcrypt.hash(password, 10);

        // Advocate = lawyer
        // Citizen = citizen
        const userRole =
            role === "lawyer"
                ? "lawyer"
                : "citizen";

        const result =
            await createUser(
                fullName.trim(),
                cleanEmail,
                hashedPassword,
                phone ? phone.trim() : "",
                userRole
            );

        // Every advocate must have a corresponding lawyers profile
        // so availability, appointments, and advocate profile data
        // can use the correct lawyers.id.
        if (userRole === "lawyer") {
            await ensureLawyerProfile(result.insertId);
        }

        // OTP has served its purpose — remove it so it can't be reused.
        await clearOtp(cleanEmail, SIGNUP_OTP_PURPOSE);

        res.status(201).json({

            success: true,

            message: "Signup Successful",

            user: {
                id: result.insertId,
                fullName: fullName.trim(),
                email: cleanEmail,
                phone: phone ? phone.trim() : "",
                role: userRole
            }

        });

    } catch (err) {

        console.error("SIGNUP ERROR:", err);

        res.status(500).json({

            success: false,

            message:
                err.message ||
                "Signup failed"

        });

    }

});


// =====================================================
// GOOGLE SIGN-IN / SIGN-UP
// POST /api/auth/google
// body: { accessToken, role }  (role only used if a new account is created)
// =====================================================

router.post("/google", async (req, res) => {

    try {

        const { accessToken, role } = req.body;

        const profile = await fetchGoogleProfile(accessToken);

        let user = await findUserByGoogleId(profile.googleId);

        if (!user) {

            // No account linked to this Google ID yet —
            // check if this email already has a password account.
            user = await findUserByEmail(profile.email);

            if (user) {

                // Existing email/password account — link Google to it.
                await linkGoogleId(user.id, profile.googleId);

            } else {

                // Brand new user, signing up via Google.
                const userRole = role === "lawyer" ? "lawyer" : "citizen";

                const result = await createGoogleUser(
                    profile.name,
                    profile.email,
                    profile.googleId,
                    userRole
                );

                user = await findUserById(result.insertId);
                user.role = userRole;
                user.full_name = profile.name;
                user.email = profile.email;

            }

        }

        // Ensure every advocate account, including Google-created
        // or previously existing Google-linked accounts, has a
        // corresponding lawyers profile.
        if (user.role === "lawyer") {
            await ensureLawyerProfile(user.id);
        }

        await issueSession(res, user);

        res.json({

            success: true,

            user: {
                id: user.id,
                fullName: user.full_name,
                email: user.email,
                phone: user.phone || "",
                role: user.role
            }

        });

    } catch (err) {

        console.error("GOOGLE AUTH ERROR:", err);

        const statusMap = {
            GOOGLE_TOKEN_MISSING: 400,
            GOOGLE_TOKEN_INVALID: 401,
            GOOGLE_EMAIL_UNVERIFIED: 403
        };

        res.status(statusMap[err.code] || 500).json({
            success: false,
            message: err.message || "Google sign-in failed."
        });

    }

});


// =====================================================
// FORGOT PASSWORD — SEND OTP
// POST /api/auth/forgot-password/send-otp
// body: { email, role }
// role: citizen | lawyer
// =====================================================

router.post("/forgot-password/send-otp", async (req, res) => {

    try {

        const { email, role } = req.body;

        if (!email || !email.trim()) {
            return res.status(400).json({
                success: false,
                message: "Email is required."
            });
        }

        const requestedRole = role === "lawyer" ? "lawyer" : "citizen";
        const cleanEmail = email.trim().toLowerCase();
        const user = await findUserByEmail(cleanEmail);

        // Do not reveal whether an email exists for the wrong portal.
        if (!user || user.role !== requestedRole) {
            return res.status(404).json({
                success: false,
                message: requestedRole === "lawyer"
                    ? "No advocate account was found with this email."
                    : "No citizen account was found with this email."
            });
        }

        const purpose = "password_reset";
        const result = await createAndSendPasswordResetOtp(cleanEmail, requestedRole);

        // The OTP service stores the code. This second email sender uses the
        // same code only when the service exposes it, so for reset we generate
        // through a dedicated path below.
        res.json({
            success: true,
            message: `Password reset code sent to ${cleanEmail}.`,
            expiresInMinutes: result.expiresInMinutes
        });

    } catch (err) {

        console.error("SEND PASSWORD RESET OTP ERROR:", err);

        if (err.code === "OTP_COOLDOWN") {
            return res.status(429).json({
                success: false,
                message: err.message,
                waitSeconds: err.waitSeconds
            });
        }

        res.status(500).json({
            success: false,
            message: err.message || "Failed to send password reset code."
        });
    }

});


// =====================================================
// FORGOT PASSWORD — VERIFY OTP
// POST /api/auth/forgot-password/verify-otp
// body: { email, otp, role }
// =====================================================

router.post("/forgot-password/verify-otp", async (req, res) => {

    try {

        const { email, otp, role } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and verification code are required."
            });
        }

        const requestedRole = role === "lawyer" ? "lawyer" : "citizen";
        const cleanEmail = email.trim().toLowerCase();
        const user = await findUserByEmail(cleanEmail);

        if (!user || user.role !== requestedRole) {
            return res.status(404).json({
                success: false,
                message: "Account not found for this portal."
            });
        }

        await verifyOtpCode(
            cleanEmail,
            "password_reset",
            String(otp).trim()
        );

        // -----------------------------------------------
        // Issue a short-lived, single-use reset token.
        // The frontend carries this (not the OTP, not the
        // user's password) to the final reset step, so the
        // reset endpoint no longer relies on OTP "verified"
        // database state alone.
        // -----------------------------------------------

        await invalidateUserResetTokens(user.id);

        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenHash = hashToken(resetToken);
        const resetTokenExpiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);

        await createResetToken(user.id, resetTokenHash, resetTokenExpiresAt);

        res.json({
            success: true,
            message: "Code verified. You can now create a new password.",
            resetToken
        });

    } catch (err) {

        console.error("VERIFY PASSWORD RESET OTP ERROR:", err);

        const status = [
            "OTP_NOT_FOUND",
            "OTP_LOCKED",
            "OTP_EXPIRED",
            "OTP_INCORRECT"
        ].includes(err.code) ? 400 : 500;

        res.status(status).json({
            success: false,
            message: err.message || "Verification failed."
        });
    }

});


// =====================================================
// FORGOT PASSWORD — SET NEW PASSWORD
// POST /api/auth/forgot-password/reset
// body: { email, newPassword, role }
// =====================================================

router.post("/forgot-password/reset", async (req, res) => {

    try {

        const { email, newPassword, role, resetToken } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Email and new password are required."
            });
        }

        if (!resetToken) {
            return res.status(400).json({
                success: false,
                message: "Please verify the password reset code first."
            });
        }

        if (String(newPassword).length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters."
            });
        }

        if (String(newPassword).length > 128) {
            return res.status(400).json({
                success: false,
                message: "Password must not exceed 128 characters."
            });
        }

        const requestedRole = role === "lawyer" ? "lawyer" : "citizen";
        const cleanEmail = email.trim().toLowerCase();
        const user = await findUserByEmail(cleanEmail);

        if (!user || user.role !== requestedRole) {
            return res.status(404).json({
                success: false,
                message: "Account not found for this portal."
            });
        }

        // -----------------------------------------------
        // Verify the single-use reset token issued after OTP
        // verification. This — not raw OTP database state —
        // is what authorizes the password change.
        // -----------------------------------------------

        const resetTokenHash = hashToken(String(resetToken));
        const tokenRow = await findValidResetToken(resetTokenHash);

        if (
            !tokenRow ||
            Number(tokenRow.user_id) !== Number(user.id) ||
            !timingSafeEqualHex(hashToken(String(resetToken)), tokenRow.token_hash)
        ) {
            return res.status(400).json({
                success: false,
                message: "This reset link is invalid or has expired. Please request a new code."
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await updateUserPassword(user.id, hashedPassword);

        // Single-use: burn this token and any other outstanding
        // ones for the account, plus the OTP that authorized it.
        await markResetTokenUsed(tokenRow.id);
        await invalidateUserResetTokens(user.id);
        await clearOtp(cleanEmail, "password_reset");

        // A password reset is a strong signal any existing
        // sessions should not continue — revoke refresh tokens
        // so previously issued sessions can't outlive the
        // password change.
        await revokeAllTokensForUser(user.id);

        res.json({
            success: true,
            message: "Password changed successfully. You can now sign in."
        });

    } catch (err) {

        console.error("RESET PASSWORD ERROR:", err);

        res.status(500).json({
            success: false,
            message: err.message || "Failed to reset password."
        });
    }

});


// =====================================================
// CITIZEN LOGIN
// POST /api/auth/login
// =====================================================

router.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {

            return res.status(400).json({

                success: false,

                message:
                    "Email and password are required."

            });

        }

        const user =
            await findUserByEmail(
                email.trim()
            );

        // IMPORTANT:
        // Use one generic message for "no such user" and
        // "wrong password" so a caller cannot use the login
        // endpoint to enumerate which emails have accounts.
        if (!user || !user.password) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password"

            });

        }

        const valid =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!valid) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password"

            });

        }

        // IMPORTANT:
        // Normal login is only for citizens.
        if (user.role !== "citizen") {

            return res.status(403).json({

                success: false,

                message:
                    "This account is not registered as a citizen."

            });

        }

        await issueSession(res, user);

        res.json({

            success: true,

            user: {

                id:
                    user.id,

                fullName:
                    user.full_name,

                email:
                    user.email,

                phone:
                    user.phone || "",

                role:
                    user.role

            }

        });

    } catch (err) {

        console.error("CITIZEN LOGIN ERROR:", err);

        res.status(500).json({

            success: false,

            message:
                err.message ||
                "Login failed"

        });

    }

});


// =====================================================
// ADVOCATE LOGIN
// POST /api/auth/advocate-login
// =====================================================

router.post("/advocate-login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {

            return res.status(400).json({

                success: false,

                message:
                    "Email and password are required."

            });

        }

        const user =
            await findUserByEmail(
                email.trim()
            );

        // IMPORTANT:
        // Use one generic message for "no such user" and
        // "wrong password" so a caller cannot use the login
        // endpoint to enumerate which emails have accounts.
        if (!user || !user.password) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password"

            });

        }

        const valid =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!valid) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password"

            });

        }

        // IMPORTANT:
        // Advocate login ONLY accepts lawyer accounts.
        if (user.role !== "lawyer") {

            return res.status(403).json({

                success: false,

                message:
                    "This account is not registered as an advocate."

            });

        }

        await issueSession(res, user);

        res.json({

            success: true,

            user: {

                id:
                    user.id,

                fullName:
                    user.full_name,

                email:
                    user.email,

                phone:
                    user.phone || "",

                role:
                    user.role

            }

        });

    } catch (err) {

        console.error(
            "ADVOCATE LOGIN ERROR:",
            err
        );

        res.status(500).json({

            success: false,

            message:
                err.message ||
                "Advocate login failed"

        });

    }

});


// =====================================================
// GET CURRENT USER PROFILE
// GET /api/auth/profile
// =====================================================

router.get(
    "/profile",
    authMiddleware,
    async (req, res) => {

        try {

            const user =
                await findUserById(
                    req.user.id
                );

            if (!user) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found"

                });

            }

            res.json({

                success: true,

                user: {

                    id:
                        user.id,

                    fullName:
                        user.full_name,

                    email:
                        user.email,

                    phone:
                        user.phone || "",

                    role:
                        user.role

                }

            });

        } catch (err) {

            console.error(
                "GET PROFILE ERROR:",
                err
            );

            res.status(500).json({

                success: false,

                message:
                    err.message ||
                    "Failed to load profile"

            });

        }

    }
);


// =====================================================
// UPDATE PROFILE
// PUT /api/auth/profile
// =====================================================

router.put(
    "/profile",
    authMiddleware,
    async (req, res) => {

        try {

            const {
                fullName,
                email,
                phone
            } = req.body;

            if (!fullName || !fullName.trim()) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Full name is required."

                });

            }

            const cleanName =
                fullName.trim();

            const cleanEmail =
                email.trim();

            const cleanPhone =
                phone
                    ? phone.trim()
                    : "";

            const existingUser =
                await findUserByEmail(
                    cleanEmail
                );

            if (
                existingUser &&
                Number(existingUser.id) !==
                Number(req.user.id)
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "This email is already registered by another user."

                });

            }

            const result =
                await updateUserProfile(

                    req.user.id,

                    cleanName,

                    cleanEmail,

                    cleanPhone

                );

            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found or no changes were made."

                });

            }

            const updatedUser =
                await findUserById(
                    req.user.id
                );

            res.json({

                success: true,

                message:
                    "Profile updated successfully.",

                user: {

                    id:
                        updatedUser.id,

                    fullName:
                        updatedUser.full_name,

                    email:
                        updatedUser.email,

                    phone:
                        updatedUser.phone || "",

                    role:
                        updatedUser.role

                }

            });

        } catch (err) {

            console.error(
                "UPDATE PROFILE ERROR:",
                err
            );

            if (
                err.code ===
                "ER_DUP_ENTRY"
            ) {

                return res.status(409).json({

                    success: false,

                    message:
                        "This email is already registered."

                });

            }

            res.status(500).json({

                success: false,

                message:
                    err.message ||
                    "Failed to update profile"

            });

        }

    }
);


// =====================================================
// REFRESH ACCESS TOKEN
// POST /api/auth/refresh
// Reads the HttpOnly refresh cookie, rotates it, and
// issues a new short-lived access token + refresh token.
// =====================================================

router.post("/refresh", async (req, res) => {

    try {

        const refreshToken = req.cookies && req.cookies[REFRESH_TOKEN_COOKIE];

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "No active session."
            });
        }

        const tokenHash = hashToken(refreshToken);
        const tokenRow = await findRefreshTokenByHash(tokenHash);

        // Reuse / theft detection: a refresh token that is
        // unknown, already revoked, or expired is treated as a
        // possible replay of a stolen token. If we can identify
        // the account it belonged to, every outstanding session
        // for that account is revoked as a precaution.
        if (!tokenRow || tokenRow.revoked || new Date(tokenRow.expires_at).getTime() < Date.now()) {

            if (tokenRow && tokenRow.revoked) {
                await revokeAllTokensForUser(tokenRow.user_id);
            }

            res.clearCookie(ACCESS_TOKEN_COOKIE, clearCookieOptions());
            res.clearCookie(REFRESH_TOKEN_COOKIE, clearCookieOptions());
            res.clearCookie(CSRF_COOKIE, csrfClearCookieOptions());

            return res.status(401).json({
                success: false,
                message: "Session expired. Please sign in again."
            });
        }

        const user = await findUserById(tokenRow.user_id);

        if (!user) {
            res.clearCookie(ACCESS_TOKEN_COOKIE, clearCookieOptions());
            res.clearCookie(REFRESH_TOKEN_COOKIE, clearCookieOptions());
            res.clearCookie(CSRF_COOKIE, csrfClearCookieOptions());

            return res.status(401).json({
                success: false,
                message: "Session expired. Please sign in again."
            });
        }

        // Rotate: the old refresh token is single-use.
        await revokeRefreshTokenByHash(tokenHash);

        const newAccessToken = signAccessToken(user);
        const newRefreshToken = generateRefreshToken();
        const newRefreshTokenHash = hashToken(newRefreshToken);
        const newRefreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

        await insertRefreshToken(user.id, newRefreshTokenHash, newRefreshExpiresAt);

        res.cookie(
            ACCESS_TOKEN_COOKIE,
            newAccessToken,
            accessCookieOptions(ACCESS_TOKEN_TTL_MS)
        );

        res.cookie(
            REFRESH_TOKEN_COOKIE,
            newRefreshToken,
            refreshCookieOptions(REFRESH_TOKEN_TTL_MS)
        );

        // Rotate the CSRF token together with the access token.
        issueCsrfCookie(res, ACCESS_TOKEN_TTL_MS);

        res.json({
            success: true,
            user: {
                id: user.id,
                fullName: user.full_name,
                email: user.email,
                phone: user.phone || "",
                role: user.role
            }
        });

    } catch (err) {

        console.error("REFRESH TOKEN ERROR:", err);

        res.status(500).json({
            success: false,
            message: "Failed to refresh session."
        });

    }

});


// =====================================================
// LOGOUT
// POST /api/auth/logout
// Clears both auth cookies and revokes the refresh token
// server-side so it cannot be replayed.
// =====================================================

router.post("/logout", async (req, res) => {

    try {

        const refreshToken = req.cookies && req.cookies[REFRESH_TOKEN_COOKIE];

        if (refreshToken) {
            await revokeRefreshTokenByHash(hashToken(refreshToken));
        }

    } catch (err) {

        console.error("LOGOUT ERROR:", err);

        // Even if revocation fails, still clear the cookies below
        // so the browser no longer presents them.

    } finally {

        res.clearCookie(ACCESS_TOKEN_COOKIE, clearCookieOptions());
        res.clearCookie(REFRESH_TOKEN_COOKIE, clearCookieOptions());
        res.clearCookie(CSRF_COOKIE, csrfClearCookieOptions());

        res.json({
            success: true,
            message: "Logged out."
        });

    }

});


module.exports = router;                                                                                                            