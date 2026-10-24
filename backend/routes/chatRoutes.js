const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");

const {
  createConversation,
  getConversations,
  getConversation,
} = require("../database/conversationModel");

const {
  createMessage,
  getMessages,
} = require("../database/messageModel");

const db = require("../db");

const router = express.Router();


// =====================================================
// GET ALL CONVERSATIONS
// GET /api/chat/conversations
// =====================================================

router.get(
  "/conversations",
  authMiddleware,
  async (req, res) => {
    try {
      const conversations = await getConversations(req.user.id);

      res.json({
        success: true,
        conversations,
      });

    } catch (err) {
      console.error("GET CONVERSATIONS ERROR:", err);

      res.status(500).json({
        success: false,
        message: "Failed to load conversations",
      });
    }
  }
);


// =====================================================
// CREATE NEW CONVERSATION
// POST /api/chat/conversations
// =====================================================

router.post(
  "/conversations",
  authMiddleware,
  async (req, res) => {
    try {
      const title =
        typeof req.body.title === "string" && req.body.title.trim()
          ? req.body.title.trim().slice(0, 200)
          : "New Chat";

      const conversationId = await createConversation(
        req.user.id,
        title
      );

      res.status(201).json({
        success: true,
        conversationId,
      });

    } catch (err) {
      console.error("CREATE CONVERSATION ERROR:", err);

      res.status(500).json({
        success: false,
        message: "Failed to create conversation",
      });
    }
  }
);


// =====================================================
// GET MESSAGES
// GET /api/chat/conversations/:id/messages
// =====================================================

router.get(
  "/conversations/:id/messages",
  authMiddleware,
  async (req, res) => {
    try {
      const conversationId = Number(req.params.id);

      if (
        !Number.isInteger(conversationId) ||
        conversationId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid conversation ID",
        });
      }

      const conversation = await getConversation(
        conversationId,
        req.user.id
      );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
      }

      const messages = await getMessages(conversationId);

      res.json({
        success: true,
        conversation,
        messages,
      });

    } catch (err) {
      console.error("GET MESSAGES ERROR:", err);

      res.status(500).json({
        success: false,
        message: "Failed to load messages",
      });
    }
  }
);


// =====================================================
// SAVE MESSAGE
// POST /api/chat/conversations/:id/messages
// =====================================================

router.post(
  "/conversations/:id/messages",
  authMiddleware,
  async (req, res) => {
    try {
      const conversationId = Number(req.params.id);

      if (
        !Number.isInteger(conversationId) ||
        conversationId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid conversation ID",
        });
      }

      const {
        sender,
        message,
      } = req.body;

      if (
        typeof sender !== "string" ||
        typeof message !== "string" ||
        !sender.trim() ||
        !message.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: "Sender and message are required",
        });
      }

      if (
        sender !== "user" &&
        sender !== "ai"
      ) {
        return res.status(400).json({
          success: false,
          message: "Sender must be user or ai",
        });
      }

      const conversation = await getConversation(
        conversationId,
        req.user.id
      );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
      }

      const messageId = await createMessage(
        conversationId,
        sender,
        message
      );

      res.json({
        success: true,
        messageId,
      });

    } catch (err) {
      console.error("SAVE MESSAGE ERROR:", err);

      res.status(500).json({
        success: false,
        message: "Failed to save message",
      });
    }
  }
);


// =====================================================
// DELETE CONVERSATION
// DELETE /api/chat/conversations/:id
// =====================================================

router.delete(
  "/conversations/:id",
  authMiddleware,
  async (req, res) => {
    let connection;

    try {
      const conversationId = Number(req.params.id);
      const userId = req.user.id;

      if (
        !Number.isInteger(conversationId) ||
        conversationId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid conversation ID",
        });
      }

      console.log("=================================");
      console.log("DELETE CHAT");
      console.log("Conversation ID:", conversationId);
      console.log("User ID:", userId);
      console.log("=================================");

      connection = await db.getConnection();

      // -------------------------------------------------
      // CHECK OWNERSHIP
      // -------------------------------------------------

      const [conversationRows] =
        await connection.query(
          `
          SELECT id
          FROM conversations
          WHERE id = ?
          AND user_id = ?
          LIMIT 1
          `,
          [
            conversationId,
            userId,
          ]
        );

      if (conversationRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
      }

      // -------------------------------------------------
      // START TRANSACTION
      // -------------------------------------------------

      await connection.beginTransaction();

      // -------------------------------------------------
      // DELETE MESSAGES
      // -------------------------------------------------

      await connection.query(
        `
        DELETE FROM messages
        WHERE conversation_id = ?
        `,
        [conversationId]
      );

      // -------------------------------------------------
      // DELETE CONVERSATION
      // -------------------------------------------------

      const [result] =
        await connection.query(
          `
          DELETE FROM conversations
          WHERE id = ?
          AND user_id = ?
          `,
          [
            conversationId,
            userId,
          ]
        );

      if (result.affectedRows === 0) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: "Conversation not found",
        });
      }

      // -------------------------------------------------
      // COMMIT
      // -------------------------------------------------

      await connection.commit();

      console.log(
        "CHAT DELETED SUCCESSFULLY:",
        conversationId
      );

      res.json({
        success: true,
        message: "Chat deleted successfully",
        conversationId,
      });

    } catch (err) {
      console.error(
        "DELETE CHAT ERROR:",
        err
      );

      if (connection) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          console.error(
            "ROLLBACK ERROR:",
            rollbackError
          );
        }
      }

      // Do not expose internal database error details
      // to the client in production.
      res.status(500).json({
        success: false,
        message: "Failed to delete chat",
      });

    } finally {
      if (connection) {
        connection.release();
      }
    }
  }
);


module.exports = router;
