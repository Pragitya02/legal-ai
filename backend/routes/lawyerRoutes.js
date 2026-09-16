const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// GET ALL REGISTERED ADVOCATES
// GET /api/lawyers
//
// Returns the real advocate profile by joining:
// users -> lawyers
// =====================================================
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        u.role,
        u.created_at,

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

      ORDER BY u.created_at DESC
    `);

    return res.json({
      success: true,
      lawyers: rows,
    });

  } catch (err) {

    console.error("GET LAWYERS ERROR:", err);

    return res.status(500).json({
      success: false,
      message:
        err.message ||
        "Failed to load advocates",
    });

  }
});

// =====================================================
// GET CLIENTS FOR LOGGED-IN ADVOCATE
// GET /api/lawyers/clients
// =====================================================
router.get("/clients", authMiddleware, async (req, res) => {
  try {
    const advocateId = Number(req.user.id);

    // Make sure the authenticated user is an advocate
    if (String(req.user.role || "").toLowerCase() !== "lawyer") {
      return res.status(403).json({
        success: false,
        message: "Only advocates can access clients.",
      });
    }

    if (!Number.isInteger(advocateId) || advocateId <= 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid advocate account.",
      });
    }

    /*
      appointments.lawyer_id = users.id
      appointments.citizen_id = users.id

      Therefore we can get the advocate's clients directly
      from confirmed/completed appointments.

      We intentionally use users.full_name as the source of
      the client's name instead of duplicating the name in
      another table.
    */
    const [rows] = await db.query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.phone,
        COUNT(a.id) AS appointment_count,
        MAX(a.appointment_date) AS last_contact
      FROM appointments a
      INNER JOIN users u
        ON u.id = a.citizen_id
      WHERE a.lawyer_id = ?
        AND a.status IN ('confirmed', 'completed')
      GROUP BY
        u.id,
        u.full_name,
        u.email,
        u.phone
      ORDER BY last_contact DESC
      `,
      [advocateId]
    );

    const clients = rows.map((row) => ({
      id: row.id,
      name: row.full_name,
      email: row.email,
      phone: row.phone,
      appointment_count: Number(row.appointment_count || 0),
      last_contact: row.last_contact,
      case: "Legal Consultation",
      status: "Active",
    }));

    return res.json({
      success: true,
      clients,
    });
  } catch (err) {
    console.error("GET ADVOCATE CLIENTS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load clients.",
    });
  }
});

module.exports = router;