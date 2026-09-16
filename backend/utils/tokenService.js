// =====================================================
// TOKEN SERVICE
// Central place for issuing/hashing authentication and
// refresh tokens, so the logic isn't duplicated across
// authRoutes and server.js.
// =====================================================

const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
}

// Short-lived access token. Kept small on purpose so a
// stolen token has a narrow window of usefulness.
const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "15m";
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

// Longer-lived refresh token, used only to mint new access
// tokens via /api/auth/refresh. Never sent to application
// routes, never exposed to JavaScript.
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function signAccessToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
        },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL }
    );
}

function verifyAccessToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

// Cryptographically random opaque refresh token. Not a JWT —
// it is meaningless outside a lookup against the hashed
// value stored in refresh_tokens, which keeps a leaked DB
// row from being directly usable as a session token.
function generateRefreshToken() {
    return crypto.randomBytes(48).toString("hex");
}

// HMAC-SHA256 keyed with the server secret. Used for both
// refresh tokens and password-reset tokens so plaintext
// tokens never touch the database.
function hashToken(token) {
    return crypto
        .createHmac("sha256", JWT_SECRET)
        .update(token)
        .digest("hex");
}

function timingSafeEqualHex(a, b) {
    const bufA = Buffer.from(String(a), "hex");
    const bufB = Buffer.from(String(b), "hex");

    if (bufA.length !== bufB.length) {
        return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = {
    ACCESS_TOKEN_TTL_MS,
    REFRESH_TOKEN_TTL_MS,
    signAccessToken,
    verifyAccessToken,
    generateRefreshToken,
    hashToken,
    timingSafeEqualHex,
};
