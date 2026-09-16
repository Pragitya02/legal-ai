const jwt = require("jsonwebtoken");
const { ACCESS_TOKEN_COOKIE } = require("../utils/cookieConfig");
const { CSRF_COOKIE, CSRF_HEADER, safeCompare } = require("../utils/csrf");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured.");
}

// Methods that change state and therefore need CSRF
// protection when authenticated via the ambient cookie.
const CSRF_PROTECTED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function extractToken(req) {
    // Sole authentication path: the HttpOnly cookie the browser
    // attaches automatically. Frontend JavaScript never reads or
    // sets it, and no other credential form is accepted.
    return req.cookies && req.cookies[ACCESS_TOKEN_COOKIE];
}

function authMiddleware(req, res, next) {
    const token = extractToken(req);

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentication required."
        });
    }

    // CSRF check: every authenticated request is authorized by
    // the ambient HttpOnly cookie, which a browser attaches
    // automatically to cross-site requests too. The request must
    // echo the non-HttpOnly CSRF cookie value back as a header,
    // which a third-party page has no way to read or forge.
    if (CSRF_PROTECTED_METHODS.has(req.method)) {
        const csrfCookie = req.cookies && req.cookies[CSRF_COOKIE];
        const csrfHeader = req.headers[CSRF_HEADER];

        if (!csrfCookie || !csrfHeader || !safeCompare(csrfCookie, csrfHeader)) {
            return res.status(403).json({
                success: false,
                message: "CSRF token missing or invalid."
            });
        }
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        if (!decoded || !decoded.id) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token."
            });
        }

        // Never trust identity fields supplied directly by the
        // client outside of this verified token.
        req.user = decoded;
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token."
        });
    }
}

module.exports = authMiddleware;
