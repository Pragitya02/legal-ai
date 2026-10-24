const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// =====================================================
// GET ALL NOTIFICATIONS FOR LOGGED-IN USER
// =====================================================

router.get("/", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const [notifications] = await db.query(
            `
            SELECT
                id,
                type,
                title,
                message,
                related_id,
                is_read,
                created_at
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            `,
            [userId]
        );

        res.json({
            success: true,
            notifications
        });

    } catch (error) {
        console.error(
            "GET NOTIFICATIONS ERROR:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to load notifications"
        });
    }
});

// =====================================================
// GET UNREAD NOTIFICATION COUNT
// =====================================================

router.get("/unread-count", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        const [rows] = await db.query(
            `
            SELECT COUNT(*) AS unreadCount
            FROM notifications
            WHERE user_id = ?
            AND is_read = 0
            `,
            [userId]
        );

        res.json({
            success: true,
            unreadCount: Number(rows[0].unreadCount)
        });

    } catch (error) {
        console.error(
            "UNREAD COUNT ERROR:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to get unread notification count"
        });
    }
});

// =====================================================
// MARK ONE NOTIFICATION AS READ
// =====================================================

router.put("/:id/read", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;

        const [result] = await db.query(
            `
            UPDATE notifications
            SET is_read = 1
            WHERE id = ?
            AND user_id = ?
            `,
            [notificationId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        res.json({
            success: true,
            message: "Notification marked as read"
        });

    } catch (error) {
        console.error(
            "MARK NOTIFICATION READ ERROR:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to mark notification as read"
        });
    }
});

// =====================================================
// MARK ALL NOTIFICATIONS AS READ
// =====================================================

router.put("/read-all", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        await db.query(
            `
            UPDATE notifications
            SET is_read = 1
            WHERE user_id = ?
            AND is_read = 0
            `,
            [userId]
        );

        res.json({
            success: true,
            message: "All notifications marked as read"
        });

    } catch (error) {
        console.error(
            "MARK ALL READ ERROR:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to mark all notifications as read"
        });
    }
});

// =====================================================
// DELETE ONE NOTIFICATION
// =====================================================

router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const notificationId = req.params.id;

        const [result] = await db.query(
            `
            DELETE FROM notifications
            WHERE id = ?
            AND user_id = ?
            `,
            [notificationId, userId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Notification not found"
            });
        }

        res.json({
            success: true,
            message: "Notification deleted"
        });

    } catch (error) {
        console.error(
            "DELETE NOTIFICATION ERROR:",
            error.message
        );

        res.status(500).json({
            success: false,
            message: "Failed to delete notification"
        });
    }
});

// =====================================================
// CREATE NOTIFICATION HELPER
// =====================================================

async function createNotification({
    userId,
    type,
    title,
    message,
    relatedId = null
}) {
    try {
        const [result] = await db.query(
            `
            INSERT INTO notifications
            (
                user_id,
                type,
                title,
                message,
                related_id
            )
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                userId,
                type,
                title,
                message,
                relatedId
            ]
        );

        return result.insertId;

    } catch (error) {
        console.error(
            "CREATE NOTIFICATION ERROR:",
            error.message
        );

        return null;
    }
}

module.exports = router;
module.exports.createNotification = createNotification;