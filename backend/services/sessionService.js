const {
    ACCESS_TOKEN_TTL_MS,
    REFRESH_TOKEN_TTL_MS,
    signAccessToken,
    generateRefreshToken,
    hashToken
} = require("../utils/tokenService");

const {
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    accessCookieOptions,
    refreshCookieOptions
} = require("../utils/cookieConfig");

const {
    issueCsrfCookie
} = require("../utils/csrf");

const {
    insertRefreshToken
} = require("../database/refreshTokenModel");

/**
 * Issue the complete authenticated session.
 *
 * Creates:
 * - HttpOnly access-token cookie
 * - HttpOnly refresh-token cookie
 * - CSRF cookie
 * - Database refresh-token record
 *
 * This is shared by citizen, lawyer and admin authentication.
 */
async function issueSession(res, user) {

    const accessToken = signAccessToken(user);

    const refreshToken = generateRefreshToken();

    const refreshTokenHash = hashToken(refreshToken);

    const refreshExpiresAt =
        new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await insertRefreshToken(
        user.id,
        refreshTokenHash,
        refreshExpiresAt
    );

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

    // CSRF token is intentionally readable by frontend JavaScript.
    // State-changing requests must echo it in the configured header.
    issueCsrfCookie(
        res,
        ACCESS_TOKEN_TTL_MS
    );
}

module.exports = {
    issueSession
};