const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const {
  joinRoom,
  touchParticipant,
  leaveRoom,
  addMessage,
  getMessages,
} = require("../services/signalingService");

const router = express.Router();

// =====================================================
// VERIFY CONSULTATION PARTICIPANT
// =====================================================
// SECURITY FIX:
// These endpoints previously trusted the :appointmentId route
// param with no check that req.user is actually a participant
// of that appointment. Any authenticated user could join, read,
// or inject WebRTC signaling messages (offers/answers/ICE
// candidates) for ANY other user's private consultation simply
// by guessing/incrementing an appointment ID (IDOR/BOLA).
//
// This mirrors the same ownership check already performed for
// the Socket.IO "join-consultation" handler in server.js.
// =====================================================

async function assertConsultationParticipant(appointmentId, userId) {
  const numericAppointmentId = Number(appointmentId);

  if (!Number.isInteger(numericAppointmentId) || numericAppointmentId <= 0) {
    const error = new Error("Invalid appointment ID");
    error.statusCode = 400;
    throw error;
  }

  const [rows] = await db.query(
    `
    SELECT id, citizen_id, lawyer_id
    FROM appointments
    WHERE id = ?
    LIMIT 1
    `,
    [numericAppointmentId]
  );

  if (rows.length === 0) {
    const error = new Error("Consultation appointment not found");
    error.statusCode = 404;
    throw error;
  }

  const appointment = rows[0];

  const isParticipant =
    Number(appointment.citizen_id) === Number(userId) ||
    Number(appointment.lawyer_id) === Number(userId);

  if (!isParticipant) {
    const error = new Error(
      "You are not authorized to access this consultation"
    );
    error.statusCode = 403;
    throw error;
  }

  return numericAppointmentId;
}

// Join a consultation signaling room
router.post("/:appointmentId/join", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    const appointmentId = await assertConsultationParticipant(
      req.params.appointmentId,
      userId
    );

    const result = joinRoom(appointmentId, userId, role);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Signaling join error:", error.message);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Unable to join consultation room",
    });
  }
});

// Keep participant active
router.post("/:appointmentId/heartbeat", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const appointmentId = await assertConsultationParticipant(
      req.params.appointmentId,
      userId
    );

    const result = touchParticipant(appointmentId, userId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Signaling heartbeat error:", error.message);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Unable to update participant status",
    });
  }
});

// Send WebRTC signaling message
router.post("/:appointmentId/message", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, payload } = req.body || {};

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Message type is required",
      });
    }

    const appointmentId = await assertConsultationParticipant(
      req.params.appointmentId,
      userId
    );

    const message = addMessage(
      appointmentId,
      userId,
      { type, payload }
    );

    res.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Signaling message error:", error.message);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Unable to send signaling message",
    });
  }
});

// Get signaling messages for the current participant
router.get("/:appointmentId/messages", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const appointmentId = await assertConsultationParticipant(
      req.params.appointmentId,
      userId
    );

    const messages = getMessages(appointmentId, userId, req.query.afterId);

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Signaling messages error:", error.message);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Unable to get signaling messages",
    });
  }
});

// Leave consultation room
router.post("/:appointmentId/leave", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const appointmentId = await assertConsultationParticipant(
      req.params.appointmentId,
      userId
    );

    const result = leaveRoom(appointmentId, userId);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Signaling leave error:", error.message);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Unable to leave consultation room",
    });
  }
});

module.exports = router;