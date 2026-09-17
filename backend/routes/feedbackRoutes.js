const express = require("express");

const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const REPORT_CATEGORIES = new Set([
    "technical_issue",
    "bad_behaviour",
    "unprofessional_conduct",
    "harassment",
    "misleading_information",
    "payment_issue",
    "other",
    "custom",
]);

let schemaPromise = null;

function ensureFeedbackSchema() {
    if (schemaPromise) return schemaPromise;

    schemaPromise = (async () => {
        await db.query(`
            CREATE TABLE IF NOT EXISTS meeting_feedback (
                id INT NOT NULL AUTO_INCREMENT,
                appointment_id INT NOT NULL,
                reviewer_id INT NOT NULL,
                reviewee_id INT NOT NULL,
                reviewer_role VARCHAR(32) NOT NULL,
                rating TINYINT NOT NULL,
                comment TEXT NULL,
                submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                UNIQUE KEY uq_feedback_appointment_reviewer (appointment_id, reviewer_id),
                KEY idx_feedback_reviewee (reviewee_id),
                KEY idx_feedback_appointment (appointment_id)
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS meeting_reports (
                id INT NOT NULL AUTO_INCREMENT,
                appointment_id INT NOT NULL,
                reporter_id INT NOT NULL,
                reported_user_id INT NOT NULL,
                category VARCHAR(64) NOT NULL,
                custom_reason TEXT NULL,
                details TEXT NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'open',
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (id),
                KEY idx_reports_reported_user (reported_user_id),
                KEY idx_reports_reporter (reporter_id),
                KEY idx_reports_appointment (appointment_id)
            )
        `);
    })().catch((error) => {
        schemaPromise = null;
        throw error;
    });

    return schemaPromise;
}

function getUserId(req) {
    return Number(req.user?.id || req.user?.userId || req.auth?.id || 0);
}

function normalizeRole(role) {
    const value = String(role || "").toLowerCase();
    if (value.includes("advocate") || value.includes("lawyer")) return "advocate";
    if (value.includes("citizen") || value.includes("user") || value.includes("client")) return "citizen";
    return value;
}

async function getAppointmentForUser(appointmentId, userId) {
    const [rows] = await db.query(
        `
            SELECT
                a.id,
                a.citizen_id,
                a.lawyer_id,
                a.status,
                citizen.full_name AS citizen_name,
                advocate.full_name AS advocate_name
            FROM appointments a
            INNER JOIN users citizen
                ON citizen.id = a.citizen_id
            INNER JOIN users advocate
                ON advocate.id = a.lawyer_id
            WHERE a.id = ?
              AND (a.citizen_id = ? OR a.lawyer_id = ?)
            LIMIT 1
        `,
        [appointmentId, userId, userId]
    );

    return rows[0] || null;
}

function getCounterpart(appointment, userId) {
    if (Number(appointment.citizen_id) === Number(userId)) {
        return {
            revieweeId: Number(appointment.lawyer_id),
            reviewerRole: "citizen",
            revieweeRole: "advocate",
            revieweeName: appointment.advocate_name || "Advocate",
        };
    }

    return {
        revieweeId: Number(appointment.citizen_id),
        reviewerRole: "advocate",
        revieweeRole: "citizen",
        revieweeName: appointment.citizen_name || "Citizen",
    };
}

/*
 * GET pending mandatory feedback for the logged-in user.
 * The frontend uses this after login/page navigation to lock the dashboard
 * until the feedback is submitted.
 */
router.get("/pending", authMiddleware, async (req, res) => {
    try {
        await ensureFeedbackSchema();

        const userId = getUserId(req);
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        const [rows] = await db.query(
            `
                SELECT
                    a.id AS appointment_id,
                    a.citizen_id,
                    a.lawyer_id,
                    a.status,
                    citizen.full_name AS citizen_name,
                    advocate.full_name AS advocate_name,
                    mf.id AS feedback_id
                FROM appointments a
                INNER JOIN users citizen
                    ON citizen.id = a.citizen_id
                INNER JOIN users advocate
                    ON advocate.id = a.lawyer_id
                LEFT JOIN meeting_feedback mf
                    ON mf.appointment_id = a.id
                   AND mf.reviewer_id = ?
                WHERE (a.citizen_id = ? OR a.lawyer_id = ?)
                  AND LOWER(COALESCE(a.status, "")) IN ("completed", "complete", "ended", "closed")
                  AND mf.id IS NULL
                ORDER BY a.id DESC
                LIMIT 1
            `,
            [userId, userId, userId]
        );

        if (!rows.length) {
            return res.json({
                success: true,
                pending: false,
                feedback: null,
            });
        }

        const row = rows[0];
        const isCitizen = Number(row.citizen_id) === userId;

        return res.json({
            success: true,
            pending: true,
            feedback: {
                appointmentId: Number(row.appointment_id),
                revieweeId: isCitizen ? Number(row.lawyer_id) : Number(row.citizen_id),
                revieweeRole: isCitizen ? "advocate" : "citizen",
                revieweeName: isCitizen
                    ? row.advocate_name || "Advocate"
                    : row.citizen_name || "Citizen",
            },
        });
    } catch (error) {
        console.error("GET /feedback/pending error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to check pending feedback.",
        });
    }
});

/*
 * GET the feedback form for one completed consultation.
 */
router.get("/form/:appointmentId", authMiddleware, async (req, res) => {
    try {
        await ensureFeedbackSchema();

        const userId = getUserId(req);
        const appointmentId = Number(req.params.appointmentId);

        if (!userId || !Number.isInteger(appointmentId) || appointmentId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid consultation information.",
            });
        }

        const appointment = await getAppointmentForUser(appointmentId, userId);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Consultation not found.",
            });
        }

        const counterpart = getCounterpart(appointment, userId);

        const [existing] = await db.query(
            `
                SELECT id, rating, comment, submitted_at
                FROM meeting_feedback
                WHERE appointment_id = ?
                  AND reviewer_id = ?
                LIMIT 1
            `,
            [appointmentId, userId]
        );

        return res.json({
            success: true,
            alreadySubmitted: existing.length > 0,
            feedback: existing[0] || null,
            consultation: {
                appointmentId,
                reviewerRole: counterpart.reviewerRole,
                revieweeRole: counterpart.revieweeRole,
                revieweeId: counterpart.revieweeId,
                revieweeName: counterpart.revieweeName,
                status: appointment.status,
            },
        });
    } catch (error) {
        console.error("GET /feedback/form error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load feedback form.",
        });
    }
});

/*
 * Submit mandatory feedback and optionally create a report in the same form.
 *
 * Rating is required for both sides.
 * Reports are optional, but if the report section is opened a category is required.
 */
router.post("/submit", authMiddleware, async (req, res) => {
    const connection = await db.getConnection();

    try {
        await ensureFeedbackSchema();

        const userId = getUserId(req);
        const appointmentId = Number(req.body?.appointmentId);
        const rating = Number(req.body?.rating);
        const comment = String(req.body?.comment || "").trim();

        const report = req.body?.report || null;
        const reportCategory = String(report?.category || "").trim();
        const customReason = String(report?.customReason || "").trim();
        const reportDetails = String(report?.details || "").trim();

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Authentication required.",
            });
        }

        if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid consultation.",
            });
        }

        if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Please select a rating from 1 to 5 stars.",
            });
        }

        if (report && (!REPORT_CATEGORIES.has(reportCategory))) {
            return res.status(400).json({
                success: false,
                message: "Please select a valid report category.",
            });
        }

        if (reportCategory === "custom" && !customReason) {
            return res.status(400).json({
                success: false,
                message: "Please describe your custom report reason.",
            });
        }

        const appointment = await getAppointmentForUser(appointmentId, userId);
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: "Consultation not found or you are not a participant.",
            });
        }

        const status = String(appointment.status || "").toLowerCase();
        if (!["completed", "complete", "ended", "closed"].includes(status)) {
            return res.status(409).json({
                success: false,
                message: "Feedback can be submitted only after the consultation has permanently ended.",
            });
        }

        const counterpart = getCounterpart(appointment, userId);

        await connection.beginTransaction();

        const [existing] = await connection.query(
            `
                SELECT id
                FROM meeting_feedback
                WHERE appointment_id = ?
                  AND reviewer_id = ?
                LIMIT 1
            `,
            [appointmentId, userId]
        );

        if (existing.length) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                message: "You have already submitted feedback for this consultation.",
            });
        }

        await connection.query(
            `
                INSERT INTO meeting_feedback
                    (appointment_id, reviewer_id, reviewee_id, reviewer_role, rating, comment)
                VALUES (?, ?, ?, ?, ?, ?)
            `,
            [
                appointmentId,
                userId,
                counterpart.revieweeId,
                counterpart.reviewerRole,
                rating,
                comment || null,
            ]
        );

        if (report) {
            await connection.query(
                `
                    INSERT INTO meeting_reports
                        (appointment_id, reporter_id, reported_user_id, category, custom_reason, details)
                    VALUES (?, ?, ?, ?, ?, ?)
                `,
                [
                    appointmentId,
                    userId,
                    counterpart.revieweeId,
                    reportCategory,
                    customReason || null,
                    reportDetails || null,
                ]
            );
        }

        await connection.commit();

        return res.json({
            success: true,
            message: "Feedback submitted successfully.",
            appointmentId,
            reported: Boolean(report),
        });
    } catch (error) {
        try {
            await connection.rollback();
        } catch {}

        if (error?.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Feedback has already been submitted for this consultation.",
            });
        }

        console.error("POST /feedback/submit error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to submit feedback.",
        });
    } finally {
        connection.release();
    }
});

/*
 * Public advocate rating summary.
 * Only citizen -> advocate feedback contributes to this rating.
 */
router.get("/advocates/:advocateId/summary", async (req, res) => {
    try {
        await ensureFeedbackSchema();

        const advocateId = Number(req.params.advocateId);
        if (!Number.isInteger(advocateId) || advocateId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid advocate.",
            });
        }

        const [rows] = await db.query(
            `
                SELECT
                    ROUND(AVG(rating), 1) AS average_rating,
                    COUNT(*) AS review_count
                FROM meeting_feedback
                WHERE reviewee_id = ?
                  AND reviewer_role = "citizen"
                  AND rating BETWEEN 1 AND 5
            `,
            [advocateId]
        );

        const average = Number(rows[0]?.average_rating || 0);
        const count = Number(rows[0]?.review_count || 0);

        return res.json({
            success: true,
            averageRating: average,
            reviewCount: count,
            displayRating: count ? average.toFixed(1) : "New",
        });
    } catch (error) {
        console.error("GET advocate rating error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load advocate rating.",
        });
    }
});

/*
 * Public advocate reviews.
 * Do not expose reviewer identity, private report information, or private comments
 * from reports.
 */
router.get("/advocates/:advocateId/reviews", async (req, res) => {
    try {
        await ensureFeedbackSchema();

        const advocateId = Number(req.params.advocateId);
        if (!Number.isInteger(advocateId) || advocateId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid advocate.",
            });
        }

        const [rows] = await db.query(
            `
                SELECT
                    id,
                    rating,
                    comment,
                    submitted_at
                FROM meeting_feedback
                WHERE reviewee_id = ?
                  AND reviewer_role = "citizen"
                  AND rating BETWEEN 1 AND 5
                ORDER BY submitted_at DESC, id DESC
                LIMIT 50
            `,
            [advocateId]
        );

        return res.json({
            success: true,
            reviews: rows.map((row) => ({
                id: Number(row.id),
                rating: Number(row.rating),
                comment: row.comment || "",
                submittedAt: row.submitted_at,
            })),
        });
    } catch (error) {
        console.error("GET advocate reviews error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to load advocate reviews.",
        });
    }
});

module.exports = router;
