const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const { createMeetingForAppointment } = require("../services/meetingService");
const { createNotification } = require("./notificationRoutes");

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
        const meetingEnded = String(meeting.appointment_status || "").toLowerCase() === "completed";
        const joinState = meetingEnded
            ? { canJoin: false, state: "permanently_ended" }
            : getJoinState(meeting.scheduled_start, meeting.scheduled_end);

        return res.json({
            success: true,
            meeting: {
                ...meeting,
                meetingEnded,
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
// PERMANENT END CALL WORKFLOW
// =====================================================
// Temporary leave is handled by the frontend/WebRTC socket and does
// not change the appointment. A permanent end request is persisted so
// it survives refreshes and can be approved by the advocate.

async function getConsultationParticipant(appointmentId, userId) {
    const numericAppointmentId = Number(appointmentId);

    if (!Number.isInteger(numericAppointmentId) || numericAppointmentId <= 0) {
        const error = new Error("Invalid appointment ID.");
        error.statusCode = 400;
        throw error;
    }

    const [rows] = await db.query(
        `
        SELECT
            id,
            citizen_id,
            lawyer_id,
            status,
            notes,
            citizen.full_name AS citizen_name,
            advocate.full_name AS advocate_name
        FROM appointments a
        INNER JOIN users citizen ON citizen.id = a.citizen_id
        INNER JOIN users advocate ON advocate.id = a.lawyer_id
        WHERE a.id = ?
        LIMIT 1
        `,
        [numericAppointmentId]
    );

    if (rows.length === 0) {
        const error = new Error("Consultation appointment not found.");
        error.statusCode = 404;
        throw error;
    }

    const appointment = rows[0];
    const isCitizen = Number(appointment.citizen_id) === Number(userId);
    const isLawyer = Number(appointment.lawyer_id) === Number(userId);

    if (!isCitizen && !isLawyer) {
        const error = new Error("You are not authorized to access this consultation.");
        error.statusCode = 403;
        throw error;
    }

    return {
        appointment,
        appointmentId: numericAppointmentId,
        isCitizen,
        isLawyer,
    };
}

// GET current permanent-end request status
router.get("/:appointmentId/end-status", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { appointment, appointmentId, isLawyer } =
            await getConsultationParticipant(req.params.appointmentId, userId);

        const [rows] = await db.query(
            `
            SELECT
                r.id,
                r.status,
                r.requested_by,
                r.requested_at,
                r.resolved_by,
                r.resolved_at,
                requester.full_name AS requester_name,
                requester.role AS requester_role
            FROM meeting_end_requests r
            INNER JOIN users requester ON requester.id = r.requested_by
            WHERE r.appointment_id = ?
            LIMIT 1
            `,
            [appointmentId]
        );

        const request = rows[0] || null;

        return res.json({
            success: true,
            meetingEnded: String(appointment.status).toLowerCase() === "completed",
            request,
            canApprove:
                Boolean(
                    request &&
                    request.status === "pending" &&
                    Number(request.requested_by) !== Number(userId)
                ),
        });
    } catch (error) {
        console.error("GET MEETING END STATUS ERROR:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Failed to load end-call status.",
        });
    }
});

// Request permanent end. BOTH participants must approve permanent closure.
// The participant who clicks Permanent End Call becomes the requester. The
// other participant must explicitly approve before the consultation ends.
router.post("/:appointmentId/end-request", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { appointment, appointmentId, isLawyer } =
            await getConsultationParticipant(req.params.appointmentId, userId);

        if (String(appointment.status).toLowerCase() !== "confirmed") {
            return res.status(409).json({ success: false, message: "This consultation is no longer active." });
        }

        const [existingRows] = await db.query(
            `SELECT id, status, requested_by FROM meeting_end_requests WHERE appointment_id = ? LIMIT 1`,
            [appointmentId]
        );

        if (existingRows.length > 0 && existingRows[0].status === "pending") {
            return res.status(409).json({
                success: false,
                message: "A permanent end-call request is already waiting for the other participant's approval.",
                request: existingRows[0],
            });
        }

        if (existingRows.length > 0) {
            await db.query(
                `UPDATE meeting_end_requests
                 SET requested_by = ?, status = 'pending', requested_at = CURRENT_TIMESTAMP,
                     resolved_by = NULL, resolved_at = NULL
                 WHERE appointment_id = ?`,
                [userId, appointmentId]
            );
        } else {
            await db.query(
                `INSERT INTO meeting_end_requests (appointment_id, requested_by, status)
                 VALUES (?, ?, 'pending')`,
                [appointmentId, userId]
            );
        }

        const requesterRole = isLawyer ? "lawyer" : "citizen";
        const approverRole = isLawyer ? "citizen" : "lawyer";
        const requesterName = isLawyer ? appointment.advocate_name : appointment.citizen_name;
        const approverId = isLawyer ? appointment.citizen_id : appointment.lawyer_id;

        await createNotification({
            userId: approverId,
            type: "meeting_end_request",
            title: "Permanent end-call approval required",
            message: `${requesterName} requested to permanently end consultation #${appointmentId}. Your approval is required.`,
            relatedId: appointmentId,
        });

        const io = req.app.get("io");
        if (io) {
            io.to(`consultation-${appointmentId}`).emit("meeting-end-requested", {
                appointmentId,
                requestedBy: userId,
                requestedByRole: requesterRole,
                requesterName,
                approverRole,
                message: `${requesterName} requested to permanently end this consultation.`,
            });
        }

        return res.json({
            success: true,
            status: "pending",
            meetingEnded: false,
            message: "Permanent end-call request sent. The other participant must approve it before the consultation ends.",
        });
    } catch (error) {
        console.error("REQUEST PERMANENT END ERROR:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Failed to request permanent end.",
        });
    }
});

// The participant who DID NOT make the request approves it.
router.post("/:appointmentId/end-request/approve", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { appointment, appointmentId } =
            await getConsultationParticipant(req.params.appointmentId, userId);

        const [requestRows] = await db.query(
            `SELECT id, requested_by FROM meeting_end_requests
             WHERE appointment_id = ? AND status = 'pending' LIMIT 1`,
            [appointmentId]
        );

        if (requestRows.length === 0) {
            return res.status(404).json({ success: false, message: "No pending permanent end-call request was found." });
        }

        const requestedBy = Number(requestRows[0].requested_by);
        if (requestedBy === Number(userId)) {
            return res.status(403).json({ success: false, message: "You cannot approve your own request. The other participant must approve it." });
        }

        const [updateResult] = await db.query(
            `UPDATE meeting_end_requests
             SET status = 'approved', resolved_by = ?, resolved_at = CURRENT_TIMESTAMP
             WHERE appointment_id = ? AND status = 'pending' AND requested_by <> ?`,
            [userId, appointmentId, userId]
        );

        if (!updateResult || updateResult.affectedRows !== 1) {
            return res.status(409).json({ success: false, message: "The permanent end-call request was already resolved." });
        }

        await db.query(
            `UPDATE appointments SET status = 'completed' WHERE id = ? AND status = 'confirmed'`,
            [appointmentId]
        );

        const approverName = Number(userId) === Number(appointment.lawyer_id)
            ? appointment.advocate_name
            : appointment.citizen_name;

        await createNotification({
            userId: requestedBy,
            type: "meeting_ended",
            title: "Permanent end-call approved",
            message: `${approverName} approved the permanent end of consultation #${appointmentId}.`,
            relatedId: appointmentId,
        });

        const io = req.app.get("io");
        if (io) {
            io.to(`consultation-${appointmentId}`).emit("meeting-permanently-ended", {
                appointmentId,
                endedBy: userId,
                endedByRole: Number(userId) === Number(appointment.lawyer_id) ? "lawyer" : "citizen",
                message: "The other participant approved the permanent end of this consultation.",
            });
        }

        return res.json({
            success: true,
            status: "approved",
            meetingEnded: true,
            message: "The consultation has been permanently ended with both participants' approval.",
        });
    } catch (error) {
        console.error("APPROVE PERMANENT END ERROR:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Failed to approve permanent end.",
        });
    }
});

// The other participant rejects a permanent end request.
router.post("/:appointmentId/end-request/reject", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { appointment, appointmentId } =
            await getConsultationParticipant(req.params.appointmentId, userId);

        const [requestRows] = await db.query(
            `SELECT id, requested_by FROM meeting_end_requests
             WHERE appointment_id = ? AND status = 'pending' LIMIT 1`,
            [appointmentId]
        );

        if (requestRows.length === 0) {
            return res.status(404).json({ success: false, message: "No pending permanent end-call request was found." });
        }

        const requestedBy = Number(requestRows[0].requested_by);
        if (requestedBy === Number(userId)) {
            return res.status(403).json({ success: false, message: "You cannot reject your own request. The other participant must respond." });
        }

        const [updateResult] = await db.query(
            `UPDATE meeting_end_requests
             SET status = 'rejected', resolved_by = ?, resolved_at = CURRENT_TIMESTAMP
             WHERE appointment_id = ? AND status = 'pending' AND requested_by <> ?`,
            [userId, appointmentId, userId]
        );

        if (!updateResult || updateResult.affectedRows !== 1) {
            return res.status(409).json({ success: false, message: "The permanent end-call request was already resolved." });
        }

        const resolverName = Number(userId) === Number(appointment.lawyer_id)
            ? appointment.advocate_name
            : appointment.citizen_name;

        await createNotification({
            userId: requestedBy,
            type: "meeting_end_request_rejected",
            title: "Permanent end-call request rejected",
            message: `${resolverName} rejected the permanent end of consultation #${appointmentId}. The consultation continues.`,
            relatedId: appointmentId,
        });

        const io = req.app.get("io");
        if (io) {
            io.to(`consultation-${appointmentId}`).emit("meeting-end-request-rejected", {
                appointmentId,
                resolvedBy: userId,
                resolvedByRole: Number(userId) === Number(appointment.lawyer_id) ? "lawyer" : "citizen",
                message: "The other participant rejected the permanent end-call request. The consultation continues.",
            });
        }

        return res.json({
            success: true,
            status: "rejected",
            meetingEnded: false,
            message: "The permanent end-call request was rejected. The consultation continues.",
        });
    } catch (error) {
        console.error("REJECT PERMANENT END ERROR:", error);
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Failed to reject permanent end.",
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
