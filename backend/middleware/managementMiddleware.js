const authMiddleware = require("./authMiddleware");

function managementMiddleware(req, res, next) {
    authMiddleware(req, res, () => {
        if (!req.user || req.user.role !== "management") {
            return res.status(403).json({
                success: false,
                message: "Management access required."
            });
        }

        next();
    });
}

module.exports = managementMiddleware;