const pool = require("../db");

// =====================================================
// CREATE MESSAGE
// =====================================================

async function createMessage(conversationId, sender, message) {
  const cleanConversationId = Number(conversationId);
  const cleanSender = String(sender || "").trim().toLowerCase();
  const cleanMessage =
    typeof message === "string"
      ? message.trim()
      : "";

  if (
    !Number.isInteger(cleanConversationId) ||
    cleanConversationId <= 0
  ) {
    throw new Error("Invalid conversation ID.");
  }

  if (
    cleanSender !== "user" &&
    cleanSender !== "ai"
  ) {
    throw new Error("Invalid message sender.");
  }

  if (!cleanMessage) {
    throw new Error("Message cannot be empty.");
  }

  const [result] = await pool.execute(
    `
      INSERT INTO messages
      (
        conversation_id,
        sender,
        message
      )
      VALUES (?, ?, ?)
    `,
    [
      cleanConversationId,
      cleanSender,
      cleanMessage,
    ]
  );

  return result.insertId;
}


// =====================================================
// GET ALL MESSAGES
// =====================================================

async function getMessages(conversationId) {
  const cleanConversationId = Number(conversationId);

  if (
    !Number.isInteger(cleanConversationId) ||
    cleanConversationId <= 0
  ) {
    throw new Error("Invalid conversation ID.");
  }

  const [rows] = await pool.execute(
    `
      SELECT
        id,
        conversation_id,
        sender,
        message,
        created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC, id ASC
    `,
    [cleanConversationId]
  );

  return rows;
}


// =====================================================
// GET RECENT MESSAGES
// =====================================================

async function getRecentMessages(
  conversationId,
  limit = 24
) {
  const cleanConversationId = Number(conversationId);

  if (
    !Number.isInteger(cleanConversationId) ||
    cleanConversationId <= 0
  ) {
    throw new Error("Invalid conversation ID.");
  }

  let safeLimit = Number(limit);

  if (
    !Number.isInteger(safeLimit) ||
    safeLimit <= 0
  ) {
    safeLimit = 24;
  }

  // Prevent excessively large queries.
  safeLimit = Math.min(safeLimit, 100);

  const [rows] = await pool.execute(
    `
      SELECT
        id,
        conversation_id,
        sender,
        message,
        created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ${safeLimit}
    `,
    [cleanConversationId]
  );

  // We queried newest first for efficiency,
  // but return them in normal conversation order.
  return rows.reverse();
}


// =====================================================
// DELETE MESSAGES FOR A CONVERSATION
// =====================================================

async function deleteMessages(conversationId) {
  const cleanConversationId = Number(conversationId);

  if (
    !Number.isInteger(cleanConversationId) ||
    cleanConversationId <= 0
  ) {
    throw new Error("Invalid conversation ID.");
  }

  const [result] = await pool.execute(
    `
      DELETE FROM messages
      WHERE conversation_id = ?
    `,
    [cleanConversationId]
  );

  return result.affectedRows;
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  createMessage,
  getMessages,
  getRecentMessages,
  deleteMessages,
};