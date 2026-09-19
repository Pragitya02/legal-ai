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


/*
=====================================================
GET MANAGEMENT REPORTS
GET /api/management/reports
=====================================================

Read-only access to the existing:

- meeting_reports
- meeting_feedback

tables.

No report status is changed here.
=====================================================
*/

router.get(
    "/reports",
    managementMiddleware,
    async (req, res) => {
        try {
            const search =
                typeof req.query.search === "string"
                    ? req.query.search.trim()
                    : "";

            const status =
                typeof req.query.status === "string"
                    ? req.query.status.trim().toLowerCase()
                    : "";

            const category =
                typeof req.query.category === "string"
                    ? req.query.category.trim()
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


            /*
            =========================================
            REPORT LIST
            =========================================
            */

            let reportSql = `
                SELECT
                    mr.id,
                    mr.appointment_id,
                    mr.reporter_id,
                    mr.reported_user_id,
                    mr.category,
                    mr.custom_reason,
                    mr.details,
                    mr.status,
                    mr.created_at,

                    reporter.full_name
                        AS reporter_name,

                    reporter.email
                        AS reporter_email,

                    reporter.role
                        AS reporter_role,

                    reported.full_name
                        AS reported_user_name,

                    reported.email
                        AS reported_user_email,

                    reported.role
                        AS reported_user_role

                FROM meeting_reports mr

                LEFT JOIN users reporter
                    ON reporter.id =
                       mr.reporter_id

                LEFT JOIN users reported
                    ON reported.id =
                       mr.reported_user_id

                WHERE 1 = 1
            `;

            const reportParams = [];


            /*
            SEARCH
            */

            if (search) {
                reportSql += `
                    AND (
                        CAST(mr.id AS CHAR)
                            LIKE ?

                        OR CAST(
                            mr.appointment_id
                            AS CHAR
                        ) LIKE ?

                        OR reporter.full_name
                            LIKE ?

                        OR reporter.email
                            LIKE ?

                        OR reported.full_name
                            LIKE ?

                        OR reported.email
                            LIKE ?

                        OR mr.category
                            LIKE ?

                        OR mr.custom_reason
                            LIKE ?

                        OR mr.details
                            LIKE ?
                    )
                `;

                const pattern =
                    `%${search}%`;

                reportParams.push(
                    pattern,
                    pattern,
                    pattern,
                    pattern,
                    pattern,
                    pattern,
                    pattern,
                    pattern,
                    pattern
                );
            }


            /*
            STATUS FILTER
            */

            if (status) {
                reportSql += `
                    AND LOWER(mr.status) = ?
                `;

                reportParams.push(status);
            }


            /*
            CATEGORY FILTER
            */

            if (category) {
                reportSql += `
                    AND mr.category = ?
                `;

                reportParams.push(category);
            }


            reportSql += `
                ORDER BY
                    mr.created_at DESC,
                    mr.id DESC

                LIMIT ?
            `;

            reportParams.push(limit);


            const [reportRows] =
                await db.query(
                    reportSql,
                    reportParams
                );


            /*
            =========================================
            TOTAL REPORTS
            =========================================
            */

            const [totalRows] =
                await db.query(`
                    SELECT
                        COUNT(*) AS total_reports,

                        SUM(
                            CASE
                                WHEN LOWER(status)
                                    = 'open'
                                THEN 1
                                ELSE 0
                            END
                        ) AS open_reports,

                        SUM(
                            CASE
                                WHEN LOWER(status)
                                    = 'resolved'
                                THEN 1
                                ELSE 0
                            END
                        ) AS resolved_reports

                    FROM meeting_reports
                `);


            /*
            =========================================
            REPORT CATEGORIES
            =========================================
            */

            const [categoryRows] =
                await db.query(`
                    SELECT
                        category,
                        COUNT(*) AS count

                    FROM meeting_reports

                    GROUP BY category

                    ORDER BY count DESC
                `);


            /*
            =========================================
            FEEDBACK STATISTICS
            =========================================
            */

            const [feedbackRows] =
                await db.query(`
                    SELECT
                        COUNT(*) AS total_feedback,

                        ROUND(
                            AVG(
                                CASE
                                    WHEN rating
                                        BETWEEN 1 AND 5
                                    THEN rating
                                    ELSE NULL
                                END
                            ),
                            1
                        ) AS average_rating

                    FROM meeting_feedback
                `);


            const totals =
                totalRows[0] || {};

            const feedback =
                feedbackRows[0] || {};


            return res.json({
                success: true,

                summary: {
                    totalReports:
                        Number(
                            totals.total_reports ||
                            0
                        ),

                    openReports:
                        Number(
                            totals.open_reports ||
                            0
                        ),

                    resolvedReports:
                        Number(
                            totals.resolved_reports ||
                            0
                        ),

                    totalFeedback:
                        Number(
                            feedback.total_feedback ||
                            0
                        ),

                    averageRating:
                        feedback.average_rating ===
                        null
                            ? 0
                            : Number(
                                feedback.average_rating ||
                                0
                            )
                },

                categories:
                    categoryRows.map(
                        (row) => ({
                            category:
                                row.category,

                            count:
                                Number(
                                    row.count || 0
                                )
                        })
                    ),

                reports:
                    reportRows.map(
                        (report) => ({
                            id:
                                Number(
                                    report.id
                                ),

                            appointmentId:
                                Number(
                                    report.appointment_id
                                ),

                            reporterId:
                                Number(
                                    report.reporter_id
                                ),

                            reporterName:
                                report.reporter_name ||
                                "Unknown",

                            reporterEmail:
                                report.reporter_email ||
                                "",

                            reporterRole:
                                report.reporter_role ||
                                "",

                            reportedUserId:
                                Number(
                                    report.reported_user_id
                                ),

                            reportedUserName:
                                report.reported_user_name ||
                                "Unknown",

                            reportedUserEmail:
                                report.reported_user_email ||
                                "",

                            reportedUserRole:
                                report.reported_user_role ||
                                "",

                            category:
                                report.category ||
                                "other",

                            customReason:
                                report.custom_reason ||
                                "",

                            details:
                                report.details ||
                                "",

                            status:
                                report.status ||
                                "open",

                            createdAt:
                                report.created_at
                        })
                    )
            });

        } catch (error) {
            console.error(
                "MANAGEMENT REPORTS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load management reports."
            });
        }
    }
);


module.exports = router;