const {
    upsertOtp,
    findOtp,
    markOtpVerified,
    incrementOtpAttempts,
    deleteOtp
} = require("../database/otpModel");

const { sendOtpEmail, sendPasswordResetOtpEmail } = require("./mailerService");
const crypto = require("crypto");

const OTP_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 45;
const MAX_ATTEMPTS = 5;

// Dedicated secret for hashing OTPs at rest. Falls back to
// JWT_SECRET (with a distinct HMAC label) if a dedicated
// secret isn't configured, so existing deployments keep
// working without a required env change — but setting
// OTP_HASH_SECRET explicitly is recommended.
const OTP_HASH_SECRET = process.env.OTP_HASH_SECRET || `${process.env.JWT_SECRET}:otp`;


function generateOtpCode() {
    // 6-digit numeric code, always zero-padded.
    // Uses crypto.randomInt (CSPRNG) instead of Math.random(),
    // which is not safe for security-sensitive codes.
    return String(crypto.randomInt(100000, 1000000));
}


// The OTP is only ever kept in memory for the brief window
// between generation and sending the email. The database
// stores only this HMAC hash, never the plaintext code.
function hashOtpCode(code) {
    return crypto
        .createHmac("sha256", OTP_HASH_SECRET)
        .update(String(code))
        .digest("hex");
}


function otpHashesMatch(submittedCode, storedHash) {
    const submittedHash = hashOtpCode(submittedCode);

    const a = Buffer.from(submittedHash, "hex");
    const b = Buffer.from(String(storedHash), "hex");

    if (a.length !== b.length) {
        return false;
    }

    // Timing-safe comparison — avoids leaking information
    // about how many leading characters matched via response
    // timing.
    return crypto.timingSafeEqual(a, b);
}


// =====================================================
// GENERATE + SEND OTP
// =====================================================

async function createAndSendOtp(email, purpose = "signup") {

    const existing = await findOtp(email, purpose);

    if (existing) {

        const secondsSinceUpdate =
            (Date.now() - new Date(existing.updated_at || existing.created_at).getTime()) / 1000;

        if (secondsSinceUpdate < RESEND_COOLDOWN_SECONDS) {

            const waitSeconds = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceUpdate);

            const err = new Error(
                `Please wait ${waitSeconds}s before requesting another code.`
            );
            err.code = "OTP_COOLDOWN";
            err.waitSeconds = waitSeconds;
            throw err;

        }

    }

    const otpCode = generateOtpCode();

    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await upsertOtp(email, hashOtpCode(otpCode), purpose, expiresAt);

    await sendOtpEmail(email, otpCode, purpose);

    return { expiresInMinutes: OTP_TTL_MINUTES };
}


// =====================================================
// GENERATE + SEND PASSWORD RESET OTP
// =====================================================

async function createAndSendPasswordResetOtp(email, role = "citizen") {

    const purpose = "password_reset";
    const existing = await findOtp(email, purpose);

    if (existing) {
        const secondsSinceUpdate =
            (Date.now() - new Date(existing.updated_at || existing.created_at).getTime()) / 1000;

        if (secondsSinceUpdate < RESEND_COOLDOWN_SECONDS) {
            const waitSeconds = Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceUpdate);
            const err = new Error(
                `Please wait ${waitSeconds}s before requesting another code.`
            );
            err.code = "OTP_COOLDOWN";
            err.waitSeconds = waitSeconds;
            throw err;
        }
    }

    const otpCode = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await upsertOtp(email, hashOtpCode(otpCode), purpose, expiresAt);
    await sendPasswordResetOtpEmail(email, otpCode, role);

    return { expiresInMinutes: OTP_TTL_MINUTES };
}


// =====================================================
// VERIFY OTP
// =====================================================

async function verifyOtpCode(email, purpose, submittedCode) {

    const row = await findOtp(email, purpose);

    if (!row) {
        const err = new Error("No verification code found for this email. Please request a new one.");
        err.code = "OTP_NOT_FOUND";
        throw err;
    }

    if (row.attempts >= MAX_ATTEMPTS) {
        const err = new Error("Too many incorrect attempts. Please request a new code.");
        err.code = "OTP_LOCKED";
        throw err;
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
        const err = new Error("This code has expired. Please request a new one.");
        err.code = "OTP_EXPIRED";
        throw err;
    }

    if (!otpHashesMatch(submittedCode, row.otp_hash)) {

        await incrementOtpAttempts(email, purpose);

        const err = new Error("Incorrect code. Please try again.");
        err.code = "OTP_INCORRECT";
        throw err;
    }

    await markOtpVerified(email, purpose);

    return true;
}


// =====================================================
// CHECK IF EMAIL IS VERIFIED (used right before account creation)
// =====================================================

async function isEmailVerified(email, purpose) {

    const row = await findOtp(email, purpose);

    if (!row) return false;
    if (!row.verified) return false;
    if (new Date(row.expires_at).getTime() < Date.now()) return false;

    return true;
}


async function clearOtp(email, purpose) {
    await deleteOtp(email, purpose);
}


module.exports = {
    createAndSendOtp,
    createAndSendPasswordResetOtp,
    verifyOtpCode,
    isEmailVerified,
    clearOtp
};
