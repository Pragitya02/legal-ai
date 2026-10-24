// =====================================================
// CSRF PROTECTION (double-submit cookie)
// =====================================================
//
// Authentication uses HttpOnly cookies, which means the
// browser attaches them automatically to any request to
// our domain — including ones triggered by a malicious
// third-party page. To stop that, every session is paired
// with a second, NON-HttpOnly cookie holding a random
// token. The frontend reads that cookie with JavaScript
// and echoes it back as a request header on state-changing
// calls. A cross-site attacker page cannot read cookies set
// for our domain (browsers enforce this regardless of
// SameSite) and cannot attach a custom header to a simple
// cross-site form submission, so it can never reproduce a
// valid header+cookie pair.
//
// This protects every state-changing request (POST/PUT/
// PATCH/DELETE), since the HttpOnly accessToken cookie is
// now the only accepted form of authentication.
// =====================================================

const crypto = require("crypto");

const isProduction = process.env.NODE_ENV === "production";

const CSRF_COOKIE = "nyaya_csrf_token";
const CSRF_HEADER = "x-csrf-token";

function generateCsrfToken() {
    return crypto.randomBytes(32).toString("hex");
}

function csrfCookieOptions(maxAgeMs) {
    return {
        // Deliberately readable by frontend JavaScript —
        // the double-submit pattern depends on that.
        httpOnly: false,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: "/",
        maxAge: maxAgeMs,
    };
}

function csrfClearCookieOptions() {
    return {
        httpOnly: false,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: "/",
    };
}

// Sets a fresh CSRF cookie and returns the token (in case a
// caller ever needs to also send it in a JSON body).
function issueCsrfCookie(res, maxAgeMs) {
    const token = generateCsrfToken();
    res.cookie(CSRF_COOKIE, token, csrfCookieOptions(maxAgeMs));
    return token;
}

function safeCompare(a, b) {
    if (typeof a !== "string" || typeof b !== "string") {
        return false;
    }

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    if (bufA.length !== bufB.length) {
        return false;
    }

    return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = {
    CSRF_COOKIE,
    CSRF_HEADER,
    issueCsrfCookie,
    csrfClearCookieOptions,
    safeCompare,
};
