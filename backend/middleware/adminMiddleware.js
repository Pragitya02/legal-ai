const authMiddleware = require("./authMiddleware");

function adminMiddleware(req, res, next) {
    // First verify the normal authenticated session.
    authMiddleware(req, res, () => {
        // Authentication succeeded, so req.user is available.
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Administrator access required."
            });
        }

        next();
    });
}

module.exports = adminMiddleware;