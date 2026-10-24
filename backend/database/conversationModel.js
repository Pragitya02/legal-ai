const pool = require("../db");

// Create a new conversation
async function createConversation(userId, title) {
  const [result] = await pool.execute(
    `
    INSERT INTO conversations (user_id, title)
    VALUES (?, ?)
    `,
    [userId, title || "New Chat"]
  );

  return result.insertId;
}

// Get all conversations for a user
async function getConversations(userId) {
  const [rows] = await pool.execute(
    `
    SELECT id, user_id, title, created_at, updated_at
    FROM conversations
    WHERE user_id = ?
    ORDER BY updated_at DESC
    `,
    [userId]
  );

  return rows;
}

// Get one conversation
async function getConversation(conversationId, userId) {
  const [rows] = await pool.execute(
    `
    SELECT id, user_id, title, created_at, updated_at
    FROM conversations
    WHERE id = ? AND user_id = ?
    LIMIT 1
    `,
    [conversationId, userId]
  );

  return rows[0] || null;
}

// Update conversation title/time
async function updateConversation(conversationId, userId, title) {
  const [result] = await pool.execute(
    `
    UPDATE conversations
    SET title = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND user_id = ?
    `,
    [title, conversationId, userId]
  );

  return result.affectedRows > 0;
}

module.exports = {
  createConversation,
  getConversations,
  getConversation,
  updateConversation,
};