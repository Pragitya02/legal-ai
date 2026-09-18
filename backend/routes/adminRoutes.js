const express = require("express");
const bcrypt = require("bcrypt");

const {
    findUserByEmail
} = require("../database/userModel");

const {
    issueSession
} = require("../services/sessionService");

const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

/*
=====================================================
ADMIN LOGIN
POST /api/admin/login

Admin login is intentionally separate from the normal
citizen and advocate login endpoints.

Only an existing database user whose role is "admin"
can authenticate through this endpoint.
=====================================================
*/

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        const user = await findUserByEmail(cleanEmail);

        /*
         * Use the same generic error for:
         * - account not found
         * - missing password
         * - incorrect password
         *
         * This prevents account enumeration.
         */
        if (!user || !user.password) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        /*
         * CRITICAL:
         * Even with a correct password, the account must
         * explicitly have the ADMIN role.
         */
        if (user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Administrator access required."
            });
        }

        /*
         * Reuse the same secure session mechanism as the
         * existing authentication system.
         */
        await issueSession(res, user);

        return res.json({
            success: true,
            message: "Admin login successful.",
            user: {
                id: user.id,
                fullName: user.full_name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("ADMIN LOGIN ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Admin login failed."
        });
    }
});


/*
=====================================================
GET CURRENT ADMIN
GET /api/admin/me

Protected by:
1. Existing authentication
2. Admin-role authorization
=====================================================
*/

router.get("/me", adminMiddleware, async (req, res) => {
    try {
        return res.json({
            success: true,
            user: {
                id: req.user.id,
                email: req.user.email,
                role: req.user.role
            }
        });
    } catch (error) {
        console.error("ADMIN ME ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to load administrator session."
        });
    }
});


module.exports = router;