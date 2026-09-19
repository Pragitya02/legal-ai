const express = require("express");
const bcrypt = require("bcrypt");

const {
    findUserByEmail
} = require("../database/userModel");

const {
    issueSession
} = require("../services/sessionService");

const managementMiddleware = require("../middleware/managementMiddleware");

const db = require("../db");

const router = express.Router();


/*
=====================================================
MANAGEMENT LOGIN
POST /api/management/login
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

        if (user.role !== "management") {
            return res.status(403).json({
                success: false,
                message: "Management access required."
            });
        }

        await issueSession(res, user);

        return res.json({
            success: true,
            message: "Management login successful.",
            user: {
                id: user.id,
                fullName: user.full_name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("MANAGEMENT LOGIN ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Management login failed."
        });
    }
});


/*
=====================================================
GET CURRENT MANAGEMENT SESSION
GET /api/management/me
=====================================================
*/

router.get(
    "/me",
    managementMiddleware,
    async (req, res) => {
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
            console.error(
                "MANAGEMENT ME ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load management session."
            });
        }
    }
);


/*
=====================================================
GET MANAGEMENT USERS
GET /api/management/users
=====================================================
*/

router.get(
    "/users",
    managementMiddleware,
    async (req, res) => {
        try {
            const search =
                typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";

            let limit =
                Number(req.query.limit || 100);

            if (
                !Number.isInteger(limit) ||
                limit < 1
            ) {
                limit = 100;
            }

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
                    fullName:
                        user.full_name || "",
                    email:
                        user.email || "",
                    phone:
                        user.phone || "",
                    role:
                        user.role,
                    createdAt:
                        user.created_at
                }))
            });

        } catch (error) {
            console.error(
                "MANAGEMENT USERS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load management users."
            });
        }
    }
);


/*
=====================================================
GET MANAGEMENT ADVOCATES
GET /api/management/advocates
=====================================================
*/

router.get(
    "/advocates",
    managementMiddleware,
    async (req, res) => {
        try {
            const search =
                typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";

            let limit =
                Number(req.query.limit || 100);

            if (
                !Number.isInteger(limit) ||
                limit < 1
            ) {
                limit = 100;
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

                advocates: rows.map((lawyer) => ({
                    id: lawyer.id,

                    fullName:
                        lawyer.full_name || "",

                    email:
                        lawyer.email || "",

                    phone:
                        lawyer.phone || "",

                    role:
                        lawyer.role,

                    createdAt:
                        lawyer.created_at,

                    lawyerId:
                        lawyer.lawyer_id || null,

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
                }))
            });

        } catch (error) {
            console.error(
                "MANAGEMENT ADVOCATES ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load management advocates."
            });
        }
    }
);


module.exports = router;