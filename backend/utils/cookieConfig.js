// =====================================================
// AUTH COOKIE CONFIGURATION
// =====================================================
//
// Centralized settings for the HttpOnly authentication
// cookies so every route/middleware that sets or clears
// them stays consistent.
//
// In production the frontend (nyayaai.online) and backend
// (onrender.com) are on different registrable domains, so a
// cross-site cookie is required: SameSite=None + Secure.
//
// In local development the frontend and backend usually run
// on http://localhost on different ports. Browsers do not
// send `Secure` cookies over plain http, and SameSite=None
// cookies must be Secure, so local dev uses SameSite=Lax
// (still sent for the same-site localhost requests) and
// Secure=false.
// =====================================================

const isProduction = process.env.NODE_ENV === "production";

const ACCESS_TOKEN_COOKIE = "nyaya_access_token";
const REFRESH_TOKEN_COOKIE = "nyaya_refresh_token";

function baseCookieOptions() {
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: "/",
    };
}

function accessCookieOptions(maxAgeMs) {
    return {
        ...baseCookieOptions(),
        maxAge: maxAgeMs,
    };
}

function refreshCookieOptions(maxAgeMs) {
    return {
        ...baseCookieOptions(),
        maxAge: maxAgeMs,
    };
}

// Options used to clear a cookie must match the attributes
// (other than maxAge/expires) it was originally set with,
// or the browser will not remove it.
function clearCookieOptions() {
    return baseCookieOptions();
}

module.exports = {
    ACCESS_TOKEN_COOKIE,
    REFRESH_TOKEN_COOKIE,
    accessCookieOptions,
    refreshCookieOptions,
    clearCookieOptions,
};
