const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const { createNotification } = require("./notificationRoutes");
const { createMeetingForAppointment, isVideoAppointment } = require("../services/meetingService");

const router = express.Router();

function parseTime(value) {
    const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const period = match[3].toUpperCase();

    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
        return null;
    }

    if (period === "AM") {
        if (hours === 12) hours = 0;
    } else if (hours !== 12) {
        hours += 12;
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function timeToMinutes(value) {
    const parts = String(value || "").slice(0, 5).split(":").map(Number);
    if (parts.length !== 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
        return NaN;
    }
    return parts[0] * 60 + parts[1];
}

function getMondayFirstDay(dateString) {
    const date = new Date(`${dateString}T12:00:00`);
    const day = date.getDay();
    return day === 0 ? 7 : day;
}

function isValidDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}

function isValidDateTime(dateString, time24) {
    const value = new Date(`${dateString}T${time24}:00`);
    return !Number.isNaN(value.getTime());
}

// =====================================================
// CREATE CONSULTATION REQUEST
// POST /api/appointments
// =====================================================
router.post("/", authMiddleware, async (req, res) => {
    try {
        const citizenId = req.user.id;
        const {
            advocateId,
            appointmentDate,
            appointmentTime,
            mode
        } = req.body;

        if (String(req.user.role || "").toLowerCase() !== "citizen") {
            return res.status(403).json({
                success: false,
                message: "Only citizen accounts can send consultation requests."
            });
        }

        if (!advocateId || !isValidDate(appointmentDate) || !appointmentTime) {
            return res.status(400).json({
                success: false,
                message: "Advocate, appointment date and appointment time are required."
            });
        }

        const time24 = parseTime(appointmentTime);

        if (!time24) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment time."
            });
        }

        if (!isValidDateTime(appointmentDate, time24)) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment date or time."
            });
        }

        const requestedDateTime = new Date(`${appointmentDate}T${time24}:00`);

        if (requestedDateTime.getTime() <= Date.now()) {
            return res.status(400).json({
                success: false,
                message: "Please select a future appointment slot."
            });
        }

        // Booking.tsx receives users.id from GET /api/lawyers.
        // appointments.lawyer_id also references users.id.
        const [advocateRows] = await db.query(
            `
            SELECT id, full_name, email
            FROM users
            WHERE id = ?
              AND role = 'lawyer'
            LIMIT 1
            `,
            [Number(advocateId)]
        );

        if (advocateRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Selected advocate was not found."
            });
        }

        const advocate = advocateRows[0];

        // Resolve users.id -> lawyers.id for availability tables.
        const [lawyerRows] = await db.query(
            `
            SELECT l.id AS lawyer_id
            FROM lawyers l
            INNER JOIN users u ON u.id = l.user_id
            WHERE u.id = ?
              AND u.role = 'lawyer'
            LIMIT 1
            `,
            [Number(advocateId)]
        );

        if (lawyerRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Advocate availability profile was not found."
            });
        }

        const lawyerId = lawyerRows[0].lawyer_id;
        const dayOfWeek = getMondayFirstDay(appointmentDate);

        const [scheduleRows] = await db.query(
            `
            SELECT start_time, end_time, is_available
            FROM lawyer_availability
            WHERE lawyer_id = ?
              AND day_of_week = ?
            LIMIT 1
            `,
            [lawyerId, dayOfWeek]
        );

        if (
            scheduleRows.length === 0 ||
            Number(scheduleRows[0].is_available) !== 1
        ) {
            return res.status(409).json({
                success: false,
                message: "The advocate is not available on the selected day."
            });
        }

        const slotStart = timeToMinutes(time24);
        const slotEnd = slotStart + 60;
        const scheduleStart = timeToMinutes(scheduleRows[0].start_time);
        const scheduleEnd = timeToMinutes(scheduleRows[0].end_time);

        if (
            !Number.isFinite(slotStart) ||
            slotStart < scheduleStart ||
            slotEnd > scheduleEnd
        ) {
            return res.status(409).json({
                success: false,
                message: "The selected time is outside the advocate's working hours."
            });
        }

        // Full-day blocks.
        const [fullDayBlocks] = await db.query(
            `
            SELECT id, reason
            FROM lawyer_time_blocks
            WHERE lawyer_id = ?
              AND block_date = ?
              AND block_type = 'full_day'
            LIMIT 1
            `,
            [lawyerId, appointmentDate]
        );

        if (fullDayBlocks.length > 0) {
            return res.status(409).json({
                success: false,
                message: fullDayBlocks[0].reason
                    ? `The selected date is blocked: ${fullDayBlocks[0].reason}`
                    : "The selected date is blocked by the advocate."
            });
        }

        // Time blocks.
        const [timeBlocks] = await db.query(
            `
            SELECT id, reason
            FROM lawyer_time_blocks
            WHERE lawyer_id = ?
              AND block_date = ?
              AND block_type = 'time_block'
              AND start_time < ADDTIME(?, '01:00:00')
              AND end_time > ?
            LIMIT 1
            `,
            [lawyerId, appointmentDate, `${time24}:00`, `${time24}:00`]
        );

        if (timeBlocks.length > 0) {
            return res.status(409).json({
                success: false,
                message: timeBlocks[0].reason
                    ? `The selected time is blocked: ${timeBlocks[0].reason}`
                    : "The selected time is blocked by the advocate."
            });
        }

        const appointmentDateTime =
            `${appointmentDate} ${time24}:00`;

        // A pending request also holds the slot until the advocate responds.
        const [existingAppointments] = await db.query(
            `
            SELECT id
            FROM appointments
            WHERE lawyer_id = ?
              AND appointment_date = ?
              AND status IN ('pending', 'confirmed')
            LIMIT 1
            `,
            [Number(advocateId), appointmentDateTime]
        );

        if (existingAppointments.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This appointment slot already has a pending or confirmed request."
            });
        }

        const requestNotes = [
            "CONSULTATION_REQUEST",
            `mode=${mode || "video"}`,
            "status=pending"
        ].join("; ");

        const [result] = await db.query(
            `
            INSERT INTO appointments
            (
                citizen_id,
                lawyer_id,
                appointment_date,
                status,
                notes
            )
            VALUES (?, ?, ?, 'pending', ?)
            `,
            [
                citizenId,
                Number(advocateId),
                appointmentDateTime,
                requestNotes
            ]
        );

        const appointmentId = result.insertId;

        const [citizenRows] = await db.query(
            `
            SELECT full_name
            FROM users
            WHERE id = ?
            LIMIT 1
            `,
            [citizenId]
        );

        const citizenName =
            citizenRows[0]?.full_name || "A citizen";

        await createNotification({
            userId: Number(advocateId),
            type: "new_consultation_request",
            title: "New consultation request",
            message:
                `${citizenName} sent a consultation request for ` +
                `${appointmentDate} at ${appointmentTime}.`,
            relatedId: appointmentId
        });

        await createNotification({
            userId: citizenId,
            type: "consultation_request_sent",
            title: "Consultation request sent",
            message:
                `Your consultation request to Adv. ${advocate.full_name} ` +
                `is waiting for advocate approval.`,
            relatedId: appointmentId
        });

        return res.status(201).json({
            success: true,
            message: "Consultation request sent to the advocate.",
            appointment: {
                id: appointmentId,
                citizenId,
                advocateId: Number(advocateId),
                advocateName: advocate.full_name,
                appointmentDate,
                appointmentTime,
                mode: mode || "video",
                status: "pending"
            }
        });
    } catch (error) {
        console.error("CREATE CONSULTATION REQUEST ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to send consultation request."
        });
    }
});

// =====================================================
// GET APPOINTMENTS FOR CURRENT USER
// GET /api/appointments
// =====================================================
router.get("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const role = String(req.user.role || "").toLowerCase();

        const [rows] = await db.query(
            `
            SELECT
                a.id,
                a.citizen_id,
                a.lawyer_id,
                DATE_FORMAT(a.appointment_date, '%Y-%m-%d %H:%i:%s') AS appointment_date,
                a.status,
                a.notes,
                a.created_at,
                citizen.full_name AS citizen_name,
                citizen.email AS citizen_email,
                advocate.full_name AS advocate_name,
                advocate.email AS advocate_email
            FROM appointments a
            INNER JOIN users citizen ON citizen.id = a.citizen_id
            INNER JOIN users advocate ON advocate.id = a.lawyer_id
            WHERE a.citizen_id = ?
               OR a.lawyer_id = ?
            ORDER BY a.appointment_date ASC
            `,
            [userId, userId]
        );

        const appointments = rows.map(row => ({
            ...row,
            requestStatus:
                row.status === "cancelled" &&
                String(row.notes || "").includes("DECLINED")
                    ? "declined"
                    : row.status
        }));

        return res.json({
            success: true,
            role,
            appointments
        });
    } catch (error) {
        console.error("GET APPOINTMENTS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to load appointments."
        });
    }
});

// =====================================================
// ADVOCATE ACCEPT / DECLINE
// PATCH /api/appointments/:id/respond
// =====================================================
router.patch("/:id/respond", authMiddleware, async (req, res) => {
    try {
        const advocateId = req.user.id;
        const action = String(req.body?.action || "").toLowerCase();

        if (String(req.user.role || "").toLowerCase() !== "lawyer") {
            return res.status(403).json({
                success: false,
                message: "Only advocate accounts can respond to consultation requests."
            });
        }

        if (!["accept", "decline"].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Action must be accept or decline."
            });
        }

        const appointmentId = Number(req.params.id);

        if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid appointment ID."
            });
        }

        const [rows] = await db.query(
            `
            SELECT
                a.id,
                a.citizen_id,
                a.lawyer_id,
                DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date,
                DATE_FORMAT(a.appointment_date, '%H:%i') AS appointment_time,
                a.status,
                a.notes,
                citizen.full_name AS citizen_name,
                advocate.full_name AS advocate_name
            FROM appointments a
            INNER JOIN users citizen ON citizen.id = a.citizen_id
            INNER JOIN users advocate ON advocate.id = a.lawyer_id
            WHERE a.id = ?
              AND a.lawyer_id = ?
            LIMIT 1
            `,
            [appointmentId, advocateId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Consultation request not found."
            });
        }

        const appointment = rows[0];

        if (appointment.status !== "pending") {
            return res.status(409).json({
                success: false,
                message: "This consultation request has already been handled."
            });
        }

        if (action === "accept") {
            const [result] = await db.query(
                `
                UPDATE appointments
                SET status = 'confirmed',
                    notes = CONCAT(COALESCE(notes, ''), '; status=confirmed')
                WHERE id = ?
                  AND lawyer_id = ?
                  AND status = 'pending'
                `,
                [appointmentId, advocateId]
            );

            if (result.affectedRows === 0) {
                return res.status(409).json({
                    success: false,
                    message: "This request could not be accepted because it was already handled."
                });
            }

            let meeting = null;

            if (isVideoAppointment(appointment.notes)) {
                try {
                    meeting = await createMeetingForAppointment(appointmentId);
                } catch (meetingError) {
                    console.error("CREATE MEETING AFTER ACCEPT ERROR:", meetingError);
                    // The appointment remains confirmed. The meeting can be created later
                    // through POST /api/meetings/:appointmentId/create.
                }
            }

            await createNotification({
                userId: appointment.citizen_id,
                type: "consultation_request_accepted",
                title: "Consultation request accepted",
                message:
                    `Adv. ${appointment.advocate_name} accepted your consultation request ` +
                    `for ${appointment.appointment_date} at ${appointment.appointment_time}.`,
                relatedId: appointmentId
            });

            if (meeting) {
                await createNotification({
                    userId: appointment.citizen_id,
                    type: "consultation_meeting_ready",
                    title: "Video consultation ready",
                    message:
                        `Your video consultation with Adv. ${appointment.advocate_name} ` +
                        `is scheduled for ${appointment.appointment_date} at ${appointment.appointment_time}. ` +
                        `You can join from the Meetings section 10 minutes before the appointment.`,
                    relatedId: appointmentId
                });
            }

            return res.json({
                success: true,
                message: "Consultation request accepted.",
                status: "confirmed",
                meeting: meeting
                    ? {
                        id: meeting.id,
                        appointmentId: appointmentId,
                        scheduledStart: meeting.scheduled_start,
                        scheduledEnd: meeting.scheduled_end,
                        joinUrl: `/meeting/${appointmentId}`
                    }
                    : null
            });
        }

        // The existing Railway appointments enum does not contain "declined".
        // We preserve the existing schema by using "cancelled" plus a DECLINED marker.
        const [result] = await db.query(
            `
            UPDATE appointments
            SET status = 'cancelled',
                notes = CONCAT(COALESCE(notes, ''), '; DECLINED: advocate declined request')
            WHERE id = ?
              AND lawyer_id = ?
              AND status = 'pending'
            `,
            [appointmentId, advocateId]
        );

        if (result.affectedRows === 0) {
            return res.status(409).json({
                success: false,
                message: "This request could not be declined because it was already handled."
            });
        }

        await createNotification({
            userId: appointment.citizen_id,
            type: "consultation_request_declined",
            title: "Consultation request declined",
            message:
                `Adv. ${appointment.advocate_name} declined your consultation request ` +
                `for ${appointment.appointment_date} at ${appointment.appointment_time}.`,
            relatedId: appointmentId
        });

        return res.json({
            success: true,
            message: "Consultation request declined.",
            status: "declined"
        });
    } catch (error) {
        console.error("RESPOND TO CONSULTATION REQUEST ERROR:", error);

        return res.status(500).json({
            success: false,
            message: error.message || "Failed to respond to consultation request."
        });
    }
});

module.exports = router;
