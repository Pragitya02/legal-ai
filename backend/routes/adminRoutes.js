const express = require("express");
const bcrypt = require("bcrypt");

const db = require("../db");
const { findUserByEmail } = require("../database/userModel");
const { issueSession } = require("../services/sessionService");
const adminMiddleware = require("../middleware/adminMiddleware");

const router = express.Router();

/*
=====================================================
ADMIN LOGIN
POST /api/admin/login
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

        if (
            !user ||
            !user.password ||
            user.role !== "admin"
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid administrator credentials."
            });
        }

        const validPassword = await bcrypt.compare(
            password,
            user.password
        );

        if (!validPassword) {
            return res.status(401).json({
                success: false,
                message: "Invalid administrator credentials."
            });
        }

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
ADMIN SESSION
GET /api/admin/me
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


/*
=====================================================
ADMIN USERS
GET /api/admin/users

Returns citizen accounts only.

Query:
?search=name/email
?limit=50
=====================================================
*/

router.get("/users", adminMiddleware, async (req, res) => {
    try {
        const search =
            typeof req.query.search === "string"
                ? req.query.search.trim()
                : "";

        let limit = Number(req.query.limit || 50);

        if (!Number.isInteger(limit) || limit < 1) {
            limit = 50;
        }

        // Prevent unnecessarily large database responses.
        limit = Math.min(limit, 100);

        let sql = `
            SELECT
                id,
                full_name,
                email,
                phone,
                role,
                created_at
            FROM users
            WHERE role = 'citizen'
        `;

        const params = [];

        if (search) {
            sql += `
                AND (
                    full_name LIKE ?
                    OR email LIKE ?
                    OR phone LIKE ?
                )
            `;

            const pattern = `%${search}%`;

            params.push(
                pattern,
                pattern,
                pattern
            );
        }

        sql += `
            ORDER BY created_at DESC
            LIMIT ?
        `;

        params.push(limit);

        const [rows] = await db.query(
            sql,
            params
        );

        return res.json({
            success: true,
            users: rows.map((user) => ({
                id: user.id,
                fullName: user.full_name,
                email: user.email,
                phone: user.phone || "",
                role: user.role,
                createdAt: user.created_at
            }))
        });

    } catch (error) {
        console.error(
            "ADMIN USERS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Failed to load users."
        });
    }
});


/*
=====================================================
ADMIN ADVOCATES
GET /api/admin/advocates

Combines:
users
+
lawyers

No password / google_id returned.
=====================================================
*/

router.get(
    "/advocates",
    adminMiddleware,
    async (req, res) => {
        try {
            const search =
                typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";

            let limit = Number(
                req.query.limit || 50
            );

            if (
                !Number.isInteger(limit) ||
                limit < 1
            ) {
                limit = 50;
            }

            limit = Math.min(limit, 100);

            let sql = `
                SELECT
                    u.id,
                    u.full_name,
                    u.email,
                    u.phone,
                    u.role,
                    u.created_at,

                    l.id AS lawyer_id,
                    l.specialization,
                    l.experience,
                    l.location,
                    l.bio,
                    l.verified,
                    l.high_court,
                    l.enrollment_year

                FROM users u

                LEFT JOIN lawyers l
                    ON l.user_id = u.id

                WHERE u.role = 'lawyer'
            `;

            const params = [];

            if (search) {
                sql += `
                    AND (
                        u.full_name LIKE ?
                        OR u.email LIKE ?
                        OR u.phone LIKE ?
                        OR l.specialization LIKE ?
                        OR l.location LIKE ?
                    )
                `;

                const pattern = `%${search}%`;

                params.push(
                    pattern,
                    pattern,
                    pattern,
                    pattern,
                    pattern
                );
            }

            sql += `
                ORDER BY u.created_at DESC
                LIMIT ?
            `;

            params.push(limit);

            const [rows] = await db.query(
                sql,
                params
            );

            return res.json({
                success: true,

                advocates: rows.map(
                    (lawyer) => ({
                        id: lawyer.id,
                        fullName:
                            lawyer.full_name,
                        email:
                            lawyer.email,
                        phone:
                            lawyer.phone || "",
                        role:
                            lawyer.role,
                        createdAt:
                            lawyer.created_at,

                        lawyerId:
                            lawyer.lawyer_id,

                        specialization:
                            lawyer.specialization || "",

                        experience:
                            lawyer.experience || "",

                        location:
                            lawyer.location || "",

                        bio:
                            lawyer.bio || "",

                        verified:
                            Boolean(lawyer.verified),

                        highCourt:
                            lawyer.high_court || "",

                        enrollmentYear:
                            lawyer.enrollment_year || ""
                    })
                )
            });

        } catch (error) {
            console.error(
                "ADMIN ADVOCATES ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load advocates."
            });
        }
    }
);


module.exports = router;