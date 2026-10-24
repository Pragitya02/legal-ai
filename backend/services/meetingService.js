const crypto = require("crypto");
const db = require("../db");

function isVideoAppointment(notes) {
    const match = String(notes || "").match(/(?:^|;)\s*mode=([^;]+)/i);
    return String(match?.[1] || "video").trim().toLowerCase() === "video";
}

function formatMySqlDateTime(date) {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

async function createMeetingForAppointment(appointmentId) {
    const [rows] = await db.query(
        `
        SELECT
            id,
            citizen_id,
            lawyer_id,
            appointment_date,
            status,
            notes
        FROM appointments
        WHERE id = ?
        LIMIT 1
        `,
        [appointmentId]
    );

    if (rows.length === 0) {
        const error = new Error("Appointment not found.");
        error.statusCode = 404;
        throw error;
    }

    const appointment = rows[0];

    if (appointment.status !== "confirmed") {
        const error = new Error("A meeting can only be created for a confirmed appointment.");
        error.statusCode = 409;
        throw error;
    }

    if (!isVideoAppointment(appointment.notes)) {
        return null;
    }

    const [existingRows] = await db.query(
        `
        SELECT
            id,
            appointment_id,
            room_name,
            DATE_FORMAT(scheduled_start, '%Y-%m-%d %H:%i:%s') AS scheduled_start,
            DATE_FORMAT(scheduled_end, '%Y-%m-%d %H:%i:%s') AS scheduled_end
        FROM consultation_meetings
        WHERE appointment_id = ?
        LIMIT 1
        `,
        [appointmentId]
    );

    if (existingRows.length > 0) {
        return existingRows[0];
    }

    const scheduledStart = new Date(appointment.appointment_date);
    const scheduledEnd = new Date(scheduledStart.getTime() + 60 * 60 * 1000);
    const roomName = `nyaya-${appointmentId}-${crypto.randomBytes(8).toString("hex")}`;

    await db.query(
        `
        INSERT INTO consultation_meetings
        (
            appointment_id,
            room_name,
            scheduled_start,
            scheduled_end
        )
        VALUES (?, ?, ?, ?)
        `,
        [
            appointmentId,
            roomName,
            formatMySqlDateTime(scheduledStart),
            formatMySqlDateTime(scheduledEnd)
        ]
    );

    const [createdRows] = await db.query(
        `
        SELECT
            id,
            appointment_id,
            room_name,
            DATE_FORMAT(scheduled_start, '%Y-%m-%d %H:%i:%s') AS scheduled_start,
            DATE_FORMAT(scheduled_end, '%Y-%m-%d %H:%i:%s') AS scheduled_end
        FROM consultation_meetings
        WHERE appointment_id = ?
        LIMIT 1
        `,
        [appointmentId]
    );

    return createdRows[0] || null;
}

module.exports = {
    createMeetingForAppointment,
    isVideoAppointment
};
