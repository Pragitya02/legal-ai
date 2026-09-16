const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const { createMeetingForAppointment } = require("../services/meetingService");

const router = express.Router();

function getJoinState(scheduledStart, scheduledEnd) {
    const now = Date.now();
    const start = new Date(scheduledStart).getTime();
    const end = new Date(scheduledEnd).getTime();

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
        return { canJoin: false, state: "invalid_time" };
    }

    const joinOpenAt = start - 10 * 60 * 1000;

    if (now < joinOpenAt) {
        return { canJoin: false, state: "upcoming" };
    }

    if (now > end) {
        return { canJoin: false, state: "ended" };
    }

    if (now < start) {
        return { canJoin: true, state: "join_early" };
    }

    return { canJoin: true, state: "live" };
}

// =====================================================
// GET MEETINGS FOR CURRENT USER
// GET /api/meetings
// =====================================================
router.get("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const [rows] = await db.query(
            `
            SELECT
                m.id,
                m.appointment_id,
                m.room_name,
                DATE_FORMAT(m.scheduled_start, '%Y-%m-%d %H:%i:%s') AS scheduled_start,
                DATE_FORMAT(m.scheduled_end, '%Y-%m-%d %H:%i:%s') AS scheduled_end,
                a.citizen_id,
                a.lawyer_id,
                a.status AS appointment_status,
                a.notes,
                citizen.full_name AS citizen_name,
                advocate.full_name AS advocate_name
            FROM consultation_meetings m
            INNER JOIN appointments a ON a.id = m.appointment_id
            INNER JOIN users citizen ON citizen.id = a.citizen_id
            INNER JOIN users advocate ON advocate.id = a.lawyer_id
            WHERE (a.citizen_id = ? OR a.lawyer_id = ?)
              AND a.status = 'confirmed'
            ORDER BY m.scheduled_start ASC
            `,
            [userId, userId]
        );

        const meetings = rows.map((meeting) => {
            const joinState = getJoinState(meeting.scheduled_start, meeting.scheduled_end);
            return {
                ...meeting,
                role: Number(meeting.citizen_id) === Number(userId) ? "citizen" : "advocate",
                ...joinState,
                joinUrl: `/meeting/${meeting.appointment_id}`
            };
        });

        return res.json({
            success: true,
            meetings
        });
    } catch (error) {
        console.error("GET MEETINGS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to load meetings."
        });
    }
});

// =====================================================
// GET ONE MEETING / CHECK ACCESS
// GET /api/meetings/:appointmentId
// =====================================================
router.get("/:appointmentId", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const appointmentId = Number(req.params.appointmentId);

        if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment ID."
            });
        }

        const [rows] = await db.query(
            `
            SELECT
                m.id,
                m.appointment_id,
                m.room_name,
                DATE_FORMAT(m.scheduled_start, '%Y-%m-%d %H:%i:%s') AS scheduled_start,
                DATE_FORMAT(m.scheduled_end, '%Y-%m-%d %H:%i:%s') AS scheduled_end,
                a.citizen_id,
                a.lawyer_id,
                a.status AS appointment_status,
                a.notes,
                citizen.full_name AS citizen_name,
                advocate.full_name AS advocate_name
            FROM consultation_meetings m
            INNER JOIN appointments a ON a.id = m.appointment_id
            INNER JOIN users citizen ON citizen.id = a.citizen_id
            INNER JOIN users advocate ON advocate.id = a.lawyer_id
            WHERE m.appointment_id = ?
              AND (a.citizen_id = ? OR a.lawyer_id = ?)
            LIMIT 1
            `,
            [appointmentId, userId, userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Meeting not found or you do not have access to it."
            });
        }

        const meeting = rows[0];
        const joinState = getJoinState(meeting.scheduled_start, meeting.scheduled_end);

        return res.json({
            success: true,
            meeting: {
                ...meeting,
                role: Number(meeting.citizen_id) === Number(userId) ? "citizen" : "advocate",
                ...joinState,
                joinUrl: `/meeting/${meeting.appointment_id}`
            }
        });
    } catch (error) {
        console.error("GET MEETING ERROR:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to load meeting."
        });
    }
});

// =====================================================
// CREATE MEETING FOR CONFIRMED APPOINTMENT
// POST /api/meetings/:appointmentId/create
// Advocate-only safety endpoint; accept flow will also create it automatically.
// =====================================================
router.post("/:appointmentId/create", authMiddleware, async (req, res) => {
    try {
        if (String(req.user.role || "").toLowerCase() !== "lawyer") {
            return res.status(403).json({
                success: false,
                message: "Only advocate accounts can create consultation meetings."
            });
        }

        const appointmentId = Number(req.params.appointmentId);
        if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment ID."
            });
        }

        const [rows] = await db.query(
            `
            SELECT id
            FROM appointments
            WHERE id = ?
              AND lawyer_id = ?
              AND status = 'confirmed'
            LIMIT 1
            `,
            [appointmentId, req.user.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Confirmed appointment not found."
            });
        }

        const meeting = await createMeetingForAppointment(appointmentId);

        if (!meeting) {
            return res.status(409).json({
                success: false,
                message: "This appointment is not a video consultation."
            });
        }

        return res.status(201).json({
            success: true,
            message: "Consultation meeting is ready.",
            meeting: {
                ...meeting,
                joinUrl: `/meeting/${appointmentId}`
            }
        });
    } catch (error) {
    console.error("CREATE MEETING ERROR:", error);

    const statusCode = Number(error.statusCode);

    if (
        Number.isInteger(statusCode) &&
        statusCode >= 400 &&
        statusCode < 500
    ) {
        return res.status(statusCode).json({
            success: false,
            message: error.message || "Unable to create meeting."
        });
    }

    return res.status(500).json({
        success: false,
        message: "Failed to create meeting."
    });
}
});

module.exports = router;
