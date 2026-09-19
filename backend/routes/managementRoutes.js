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


module.exports = router;