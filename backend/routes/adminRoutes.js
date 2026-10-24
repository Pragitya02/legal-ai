const express = require("express");
const bcrypt = require("bcrypt");

const {
    findUserByEmail
} = require("../database/userModel");

const {
    issueSession
} = require("../services/sessionService");

const adminMiddleware = require("../middleware/adminMiddleware");

const db = require("../db");

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

        if (user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Administrator access required."
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
GET CURRENT ADMIN
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
GET USERS
GET /api/admin/users
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
GET SINGLE USER
GET /api/admin/users/:userId
=====================================================
*/

router.get(
    "/users/:userId",
    adminMiddleware,
    async (req, res) => {

        try {
            const userId = Number(
                req.params.userId
            );

            if (
                !Number.isInteger(userId) ||
                userId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID."
                });
            }

            /*
            Security hardening:
            Do NOT retrieve the actual password hash
            or Google ID. Only retrieve whether each
            authentication method is configured.
            */
            const [users] = await db.query(
                `
                SELECT
                    id,
                    full_name,
                    email,
                    phone,
                    role,
                    created_at,
                    (
                        password IS NOT NULL
                        AND password <> ''
                    ) AS password_configured,
                    (
                        google_id IS NOT NULL
                        AND google_id <> ''
                    ) AS google_connected
                FROM users
                WHERE id = ?
                  AND role = 'citizen'
                LIMIT 1
                `,
                [userId]
            );

            if (
                !users ||
                users.length === 0
            ) {
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });
            }

            const user = users[0];

            const [documentCount] =
                await db.query(
                    `
                    SELECT COUNT(*) AS count
                    FROM documents
                    WHERE user_id = ?
                    `,
                    [userId]
                );

            const [caseCount] =
                await db.query(
                    `
                    SELECT COUNT(*) AS count
                    FROM cases
                    WHERE user_id = ?
                    `,
                    [userId]
                );

            const [appointmentCount] =
                await db.query(
                    `
                    SELECT COUNT(*) AS count
                    FROM appointments
                    WHERE citizen_id = ?
                    `,
                    [userId]
                );

            const [securityRows] =
                await db.query(
                    `
                    SELECT id
                    FROM document_security
                    WHERE user_id = ?
                    LIMIT 1
                    `,
                    [userId]
                );

            return res.json({
                success: true,

                user: {
                    id: user.id,
                    fullName: user.full_name,
                    email: user.email,
                    phone: user.phone || "",
                    role: user.role,
                    createdAt: user.created_at,

                    statistics: {
                        documents: Number(
                            documentCount[0]?.count || 0
                        ),

                        cases: Number(
                            caseCount[0]?.count || 0
                        ),

                        appointments: Number(
                            appointmentCount[0]?.count || 0
                        )
                    },

                    security: {
                        passwordConfigured:
                            Boolean(
                                user.password_configured
                            ),

                        googleConnected:
                            Boolean(
                                user.google_connected
                            ),

                        documentSecurityConfigured:
                            securityRows.length > 0
                    }
                }
            });

        } catch (error) {
            console.error(
                "ADMIN USER DETAIL ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Failed to load user details."
            });
        }
    }
);


/*
=====================================================
GET USER DOCUMENTS
GET /api/admin/users/:userId/documents
=====================================================
*/

router.get(
    "/users/:userId/documents",
    adminMiddleware,
    async (req, res) => {

        try {
            const userId = Number(
                req.params.userId
            );

            if (
                !Number.isInteger(userId) ||
                userId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID."
                });
            }

            const [userRows] =
                await db.query(
                    `
                    SELECT id
                    FROM users
                    WHERE id = ?
                      AND role = 'citizen'
                    LIMIT 1
                    `,
                    [userId]
                );

            if (userRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });
            }

            const [documents] =
                await db.query(
                    `
                    SELECT
                        id,
                        file_name,
                        file_type,
                        uploaded_at,
                        document_hash,
                        blockchain_tx_hash,
                        blockchain_status
                    FROM documents
                    WHERE user_id = ?
                    ORDER BY uploaded_at DESC
                    `,
                    [userId]
                );

            return res.json({
                success: true,

                documents: documents.map(
                    (document) => ({
                        id: document.id,

                        fileName:
                            document.file_name,

                        fileType:
                            document.file_type,

                        uploadedAt:
                            document.uploaded_at,

                        documentHash:
                            document.document_hash || null,

                        blockchainTxHash:
                            document.blockchain_tx_hash || null,

                        blockchainStatus:
                            document.blockchain_status || null
                    })
                )
            });

        } catch (error) {
            console.error(
                "ADMIN USER DOCUMENTS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load user documents."
            });
        }
    }
);


/*
=====================================================
GET USER AUDIT TRAIL
GET /api/admin/users/:userId/audit
=====================================================
*/

router.get(
    "/users/:userId/audit",
    adminMiddleware,
    async (req, res) => {

        try {
            const userId = Number(
                req.params.userId
            );

            if (
                !Number.isInteger(userId) ||
                userId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid user ID."
                });
            }

            const [userRows] =
                await db.query(
                    `
                    SELECT id
                    FROM users
                    WHERE id = ?
                      AND role = 'citizen'
                    LIMIT 1
                    `,
                    [userId]
                );

            if (userRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found."
                });
            }

            const [auditRows] =
                await db.query(
                    `
                    SELECT
                        id,
                        entity_type,
                        entity_id,
                        action,
                        description,
                        ip_address,
                        user_agent,
                        metadata,
                        created_at
                    FROM audit_logs
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                    `,
                    [userId]
                );

            return res.json({
                success: true,

                audit: auditRows.map(
                    (row) => ({
                        id:
                            row.id,

                        entityType:
                            row.entity_type,

                        entityId:
                            row.entity_id,

                        action:
                            row.action,

                        description:
                            row.description,

                        ipAddress:
                            row.ip_address,

                        userAgent:
                            row.user_agent,

                        metadata:
                            row.metadata,

                        createdAt:
                            row.created_at
                    })
                )
            });

        } catch (error) {
            console.error(
                "ADMIN USER AUDIT ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load user audit trail."
            });
        }
    }
);


/*
=====================================================
GET ADVOCATES
GET /api/admin/advocates
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

            let limit =
                Number(req.query.limit || 50);

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

                const pattern =
                    `%${search}%`;

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

            const [rows] =
                await db.query(
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
                            Boolean(
                                lawyer.verified
                            ),

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


/*
=====================================================
GET SINGLE ADVOCATE
GET /api/admin/advocates/:advocateId
=====================================================
*/

router.get(
    "/advocates/:advocateId",
    adminMiddleware,
    async (req, res) => {

        try {
            const advocateId =
                Number(req.params.advocateId);

            if (
                !Number.isInteger(advocateId) ||
                advocateId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid advocate ID."
                });
            }

            /*
            Security hardening:
            Do NOT retrieve the actual password hash
            or Google ID. Only retrieve whether each
            authentication method is configured.
            */
            const [rows] =
                await db.query(
                    `
                    SELECT
                        u.id,
                        u.full_name,
                        u.email,
                        u.phone,
                        u.role,
                        u.created_at,

                        (
                            u.password IS NOT NULL
                            AND u.password <> ''
                        ) AS password_configured,

                        (
                            u.google_id IS NOT NULL
                            AND u.google_id <> ''
                        ) AS google_connected,

                        l.id AS lawyer_id,
                        l.specialization,
                        l.experience,
                        l.location,
                        l.bio,
                        l.verified,
                        l.high_court,
                        l.enrollment_year

                    FROM users u

                    INNER JOIN lawyers l
                        ON l.user_id = u.id

                    WHERE u.id = ?
                      AND u.role = 'lawyer'

                    LIMIT 1
                    `,
                    [advocateId]
                );

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Advocate not found."
                });
            }

            const advocate = rows[0];

            const [documentCount] =
                await db.query(
                    `
                    SELECT COUNT(*) AS count
                    FROM documents
                    WHERE user_id = ?
                    `,
                    [advocateId]
                );

            const [consultationCount] =
                await db.query(
                    `
                    SELECT COUNT(*) AS count
                    FROM appointments
                    WHERE lawyer_id = ?
                    `,
                    [advocate.lawyer_id]
                );

            const [clientCount] =
                await db.query(
                    `
                    SELECT COUNT(
                        DISTINCT citizen_id
                    ) AS count
                    FROM appointments
                    WHERE lawyer_id = ?
                    `,
                    [advocate.lawyer_id]
                );

            const [securityRows] =
                await db.query(
                    `
                    SELECT id
                    FROM document_security
                    WHERE user_id = ?
                    LIMIT 1
                    `,
                    [advocateId]
                );

            return res.json({
                success: true,

                advocate: {
                    id:
                        advocate.id,

                    fullName:
                        advocate.full_name,

                    email:
                        advocate.email,

                    phone:
                        advocate.phone || "",

                    role:
                        advocate.role,

                    createdAt:
                        advocate.created_at,

                    professional: {
                        lawyerId:
                            advocate.lawyer_id,

                        specialization:
                            advocate.specialization || "",

                        experience:
                            advocate.experience || "",

                        location:
                            advocate.location || "",

                        bio:
                            advocate.bio || "",

                        verified:
                            Boolean(
                                advocate.verified
                            ),

                        highCourt:
                            advocate.high_court || "",

                        enrollmentYear:
                            advocate.enrollment_year || ""
                    },

                    statistics: {
                        documents:
                            Number(
                                documentCount[0]?.count || 0
                            ),

                        consultations:
                            Number(
                                consultationCount[0]?.count || 0
                            ),

                        clients:
                            Number(
                                clientCount[0]?.count || 0
                            )
                    },

                    security: {
                        passwordConfigured:
                            Boolean(
                                advocate.password_configured
                            ),

                        googleConnected:
                            Boolean(
                                advocate.google_connected
                            ),

                        documentSecurityConfigured:
                            securityRows.length > 0
                    }
                }
            });

        } catch (error) {
            console.error(
                "ADMIN ADVOCATE DETAIL ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load advocate details."
            });
        }
    }
);


/*
=====================================================
GET ADVOCATE DOCUMENTS
GET /api/admin/advocates/:advocateId/documents
=====================================================
*/

router.get(
    "/advocates/:advocateId/documents",
    adminMiddleware,
    async (req, res) => {

        try {
            const advocateId =
                Number(req.params.advocateId);

            if (
                !Number.isInteger(advocateId) ||
                advocateId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid advocate ID."
                });
            }

            const [userRows] =
                await db.query(
                    `
                    SELECT id
                    FROM users
                    WHERE id = ?
                      AND role = 'lawyer'
                    LIMIT 1
                    `,
                    [advocateId]
                );

            if (userRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Advocate not found."
                });
            }

            const [documents] =
                await db.query(
                    `
                    SELECT
                        id,
                        file_name,
                        file_type,
                        uploaded_at,
                        document_hash,
                        blockchain_tx_hash,
                        blockchain_status
                    FROM documents
                    WHERE user_id = ?
                    ORDER BY uploaded_at DESC
                    `,
                    [advocateId]
                );

            return res.json({
                success: true,

                documents: documents.map(
                    (document) => ({
                        id:
                            document.id,

                        fileName:
                            document.file_name,

                        fileType:
                            document.file_type,

                        uploadedAt:
                            document.uploaded_at,

                        documentHash:
                            document.document_hash || null,

                        blockchainTxHash:
                            document.blockchain_tx_hash || null,

                        blockchainStatus:
                            document.blockchain_status || null
                    })
                )
            });

        } catch (error) {
            console.error(
                "ADMIN ADVOCATE DOCUMENTS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load advocate documents."
            });
        }
    }
);


/*
=====================================================
GET ADVOCATE CONSULTATIONS
GET /api/admin/advocates/:advocateId/consultations
=====================================================
*/

router.get(
    "/advocates/:advocateId/consultations",
    adminMiddleware,
    async (req, res) => {

        try {
            const advocateId =
                Number(req.params.advocateId);

            if (
                !Number.isInteger(advocateId) ||
                advocateId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid advocate ID."
                });
            }

            const [lawyerRows] =
                await db.query(
                    `
                    SELECT
                        id
                    FROM lawyers
                    WHERE user_id = ?
                    LIMIT 1
                    `,
                    [advocateId]
                );

            if (lawyerRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Advocate profile not found."
                });
            }

            const lawyerId =
                lawyerRows[0].id;

            const [appointments] =
                await db.query(
                    `
                    SELECT
                        a.id,
                        a.appointment_date,
                        a.status,
                        a.notes,
                        a.created_at,

                        u.id AS citizen_id,
                        u.full_name AS citizen_name,
                        u.email AS citizen_email,
                        u.phone AS citizen_phone

                    FROM appointments a

                    INNER JOIN users u
                        ON u.id = a.citizen_id

                    WHERE a.lawyer_id = ?

                    ORDER BY
                        a.appointment_date DESC,
                        a.created_at DESC
                    `,
                    [lawyerId]
                );

            return res.json({
                success: true,

                consultations:
                    appointments.map(
                        (appointment) => ({
                            id:
                                appointment.id,

                            appointmentDate:
                                appointment.appointment_date,

                            status:
                                appointment.status,

                            notes:
                                appointment.notes || "",

                            createdAt:
                                appointment.created_at,

                            citizen: {
                                id:
                                    appointment.citizen_id,

                                name:
                                    appointment.citizen_name,

                                email:
                                    appointment.citizen_email,

                                phone:
                                    appointment.citizen_phone || ""
                            }
                        })
                    )
            });

        } catch (error) {
            console.error(
                "ADMIN ADVOCATE CONSULTATIONS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load advocate consultations."
            });
        }
    }
);


/*
=====================================================
GET ADVOCATE AUDIT TRAIL
GET /api/admin/advocates/:advocateId/audit
=====================================================
*/

router.get(
    "/advocates/:advocateId/audit",
    adminMiddleware,
    async (req, res) => {

        try {
            const advocateId =
                Number(req.params.advocateId);

            if (
                !Number.isInteger(advocateId) ||
                advocateId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid advocate ID."
                });
            }

            const [userRows] =
                await db.query(
                    `
                    SELECT id
                    FROM users
                    WHERE id = ?
                      AND role = 'lawyer'
                    LIMIT 1
                    `,
                    [advocateId]
                );

            if (userRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Advocate not found."
                });
            }

            const [auditRows] =
                await db.query(
                    `
                    SELECT
                        id,
                        entity_type,
                        entity_id,
                        action,
                        description,
                        ip_address,
                        user_agent,
                        metadata,
                        created_at
                    FROM audit_logs
                    WHERE user_id = ?
                    ORDER BY created_at DESC
                    `,
                    [advocateId]
                );

            return res.json({
                success: true,

                audit: auditRows.map(
                    (row) => ({
                        id:
                            row.id,

                        entityType:
                            row.entity_type,

                        entityId:
                            row.entity_id,

                        action:
                            row.action,

                        description:
                            row.description,

                        ipAddress:
                            row.ip_address,

                        userAgent:
                            row.user_agent,

                        metadata:
                            row.metadata,

                        createdAt:
                            row.created_at
                    })
                )
            });

        } catch (error) {
            console.error(
                "ADMIN ADVOCATE AUDIT ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load advocate audit trail."
            });
        }
    }
);


module.exports = router;