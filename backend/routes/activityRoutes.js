const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../db");

const router = express.Router();

// GET /api/activity/recent — only the authenticated user's activity.
router.get("/recent", authMiddleware, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Invalid user authentication." });
    }

    const [rows] = await db.query(
      `SELECT id, action, description, entity_type, entity_id, status, created_at
       FROM user_activity
       WHERE user_id = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 10`,
      [userId]
    );

    return res.json({ success: true, activities: rows });
  } catch (error) {
    console.error("GET RECENT ACTIVITY ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load recent activity." });
  }
});

module.exports = router;
