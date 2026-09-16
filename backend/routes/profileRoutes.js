const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// GET CURRENT PROFILE
// GET /api/profile
// =====================================================

router.get("/", authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(
            `
            SELECT
                u.id,
                u.full_name,
                u.email,
                u.phone,
                u.role,

                l.specialization,
                l.experience,
                l.location,
                l.bio,
                l.verified,
                l.bar_council_no,
                l.high_court,
                l.enrollment_year

            FROM users u
            LEFT JOIN lawyers l
                ON l.user_id = u.id
            WHERE u.id = ?
            LIMIT 1
            `,
            [req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        const user = rows[0];

        res.json({
            success: true,
            user: {
                id: user.id,
                fullName: user.full_name,
                email: user.email,
                phone: user.phone || "",
                role: user.role,

                city: user.location || "",
                bio: user.bio || "",

                practiceAreas: user.specialization
                    ? String(user.specialization)
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean)
                    : [],

                specialization: user.specialization || "",
                experience: user.experience || 0,
                verified: Boolean(user.verified),

                barCouncilNo: user.bar_council_no || "",
                highCourt: user.high_court || "",
                enrollmentYear:
                    user.enrollment_year != null
                        ? String(user.enrollment_year)
                        : "",
            },
        });
    } catch (err) {
        console.error("GET PROFILE ERROR:", err);

        res.status(500).json({
            success: false,
            message:
                err.message || "Failed to load profile",
        });
    }
});


// =====================================================
// UPDATE CURRENT PROFILE
// PUT /api/profile
// =====================================================

router.put("/", authMiddleware, async (req, res) => {
    try {
        const {
            fullName,
            email,
            phone,
            city,
            bio,
            barCouncilNo,
            practiceAreas,
            highCourt,
            enrollmentYear,
        } = req.body;

        if (!fullName || !String(fullName).trim()) {
            return res.status(400).json({
                success: false,
                message: "Full name is required.",
            });
        }

        if (!email || !String(email).trim()) {
            return res.status(400).json({
                success: false,
                message: "Email is required.",
            });
        }

        const cleanName = String(fullName).trim();
        const cleanEmail = String(email).trim();
        const cleanPhone = phone
            ? String(phone).trim()
            : "";

        const cleanCity = city
            ? String(city).trim()
            : "";

        const cleanBio = bio
            ? String(bio).trim()
            : "";

        const existingUserResult = await db.query(
            `
            SELECT id
            FROM users
            WHERE email = ?
            LIMIT 1
            `,
            [cleanEmail]
        );

        const existingUser =
            existingUserResult[0][0];

        if (
            existingUser &&
            Number(existingUser.id) !==
                Number(req.user.id)
        ) {
            return res.status(409).json({
                success: false,
                message:
                    "This email is already registered by another user.",
            });
        }

        // ---------------------------------------------
        // UPDATE USERS TABLE
        // ---------------------------------------------

        await db.query(
            `
            UPDATE users
            SET
                full_name = ?,
                email = ?,
                phone = ?
            WHERE id = ?
            `,
            [
                cleanName,
                cleanEmail,
                cleanPhone,
                req.user.id,
            ]
        );

        // ---------------------------------------------
        // ADVOCATE-SPECIFIC PROFILE
        // ---------------------------------------------

        if (
            String(req.user.role).toLowerCase() ===
            "lawyer"
        ) {
            const areas = Array.isArray(practiceAreas)
                ? practiceAreas
                    .map((item) => String(item).trim())
                    .filter(Boolean)
                : [];

            const specialization =
                areas.join(", ");

            const year =
                enrollmentYear &&
                /^\d{4}$/.test(
                    String(enrollmentYear).trim()
                )
                    ? Number(
                        String(enrollmentYear).trim()
                    )
                    : null;

            const [lawyerRows] = await db.query(
                `
                SELECT id
                FROM lawyers
                WHERE user_id = ?
                LIMIT 1
                `,
                [req.user.id]
            );

            if (lawyerRows.length) {
                await db.query(
                    `
                    UPDATE lawyers
                    SET
                        specialization = ?,
                        location = ?,
                        bio = ?,
                        bar_council_no = ?,
                        high_court = ?,
                        enrollment_year = ?
                    WHERE user_id = ?
                    `,
                    [
                        specialization,
                        cleanCity,
                        cleanBio,
                        barCouncilNo
                            ? String(barCouncilNo).trim()
                            : "",
                        highCourt
                            ? String(highCourt).trim()
                            : "",
                        year,
                        req.user.id,
                    ]
                );
            } else {
                await db.query(
                    `
                    INSERT INTO lawyers
                    (
                        user_id,
                        specialization,
                        experience,
                        location,
                        bio,
                        verified,
                        bar_council_no,
                        high_court,
                        enrollment_year
                    )
                    VALUES (?, ?, 0, ?, ?, 0, ?, ?, ?)
                    `,
                    [
                        req.user.id,
                        specialization,
                        cleanCity,
                        cleanBio,
                        barCouncilNo
                            ? String(barCouncilNo).trim()
                            : "",
                        highCourt
                            ? String(highCourt).trim()
                            : "",
                        year,
                    ]
                );
            }
        }

        // ---------------------------------------------
        // RETURN FRESH PROFILE
        // ---------------------------------------------

        const [rows] = await db.query(
            `
            SELECT
                u.id,
                u.full_name,
                u.email,
                u.phone,
                u.role,

                l.specialization,
                l.experience,
                l.location,
                l.bio,
                l.verified,
                l.bar_council_no,
                l.high_court,
                l.enrollment_year

            FROM users u
            LEFT JOIN lawyers l
                ON l.user_id = u.id
            WHERE u.id = ?
            LIMIT 1
            `,
            [req.user.id]
        );

        if (!rows.length) {
            return res.status(404).json({
                success: false,
                message:
                    "Profile was updated but could not be reloaded.",
            });
        }

        const user = rows[0];

        res.json({
            success: true,
            message: "Profile updated successfully.",
            user: {
                id: user.id,
                fullName: user.full_name,
                email: user.email,
                phone: user.phone || "",
                role: user.role,

                city: user.location || "",
                bio: user.bio || "",

                practiceAreas: user.specialization
                    ? String(user.specialization)
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean)
                    : [],

                specialization: user.specialization || "",
                experience: user.experience || 0,
                verified: Boolean(user.verified),

                barCouncilNo:
                    user.bar_council_no || "",

                highCourt:
                    user.high_court || "",

                enrollmentYear:
                    user.enrollment_year != null
                        ? String(user.enrollment_year)
                        : "",
            },
        });
    } catch (err) {
        console.error("UPDATE PROFILE ERROR:", err);

        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message:
                    "This email is already registered.",
            });
        }

        res.status(500).json({
            success: false,
            message:
                err.message ||
                "Failed to update profile",
        });
    }
});

module.exports = router;
