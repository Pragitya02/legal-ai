const db = require("../db");

const STATEMENTS = [
`CREATE TABLE IF NOT EXISTS work_conversations (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_work_conv_user (user_id, updated_at)
)`,
`CREATE TABLE IF NOT EXISTS work_messages (
  id INT NOT NULL AUTO_INCREMENT,
  conversation_id INT NOT NULL,
  role VARCHAR(20) NOT NULL,
  kind VARCHAR(20) NOT NULL DEFAULT 'chat',
  title VARCHAR(200) DEFAULT NULL,
  content MEDIUMTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_work_msg_conv (conversation_id, id),
  CONSTRAINT fk_work_msg_conv FOREIGN KEY (conversation_id) REFERENCES work_conversations(id) ON DELETE CASCADE
)`,
`CREATE TABLE IF NOT EXISTS work_documents (
  id INT NOT NULL AUTO_INCREMENT,
  conversation_id INT NOT NULL,
  user_id INT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) DEFAULT NULL,
  extracted_text MEDIUMTEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_work_doc_conv (conversation_id, user_id),
  CONSTRAINT fk_work_doc_conv FOREIGN KEY (conversation_id) REFERENCES work_conversations(id) ON DELETE CASCADE
)`,
];

async function ensureWorkTables() {
  for (const stmt of STATEMENTS) await db.query(stmt);
  console.log("WORK TABLES READY");
}

async function createConversation(userId, title) {
  const t = (title || "New Chat").trim().slice(0, 200) || "New Chat";
  const [r] = await db.query(
    "INSERT INTO work_conversations (user_id, title) VALUES (?, ?)",
    [userId, t]
  );
  return r.insertId;
}

async function getConversation(id, userId) {
  const [rows] = await db.query(
    "SELECT id, title, created_at, updated_at FROM work_conversations WHERE id = ? AND user_id = ? LIMIT 1",
    [id, userId]
  );
  return rows[0] || null;
}

async function listConversations(userId, q) {
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    const [rows] = await db.query(
      `SELECT c.id, c.title, c.created_at, c.updated_at
         FROM work_conversations c
        WHERE c.user_id = ?
          AND (c.title LIKE ? OR EXISTS (
                SELECT 1 FROM work_messages m
                 WHERE m.conversation_id = c.id AND m.content LIKE ?))
        ORDER BY c.updated_at DESC, c.id DESC LIMIT 100`,
      [userId, like, like]
    );
    return rows;
  }
  const [rows] = await db.query(
    "SELECT id, title, created_at, updated_at FROM work_conversations WHERE user_id = ? ORDER BY updated_at DESC, id DESC LIMIT 100",
    [userId]
  );
  return rows;
}

async function touchConversation(id) {
  await db.query("UPDATE work_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", [id]);
}

async function deleteConversation(id, userId) {
  const [r] = await db.query("DELETE FROM work_conversations WHERE id = ? AND user_id = ?", [id, userId]);
  return r.affectedRows > 0;
}

async function addMessage(conversationId, role, content, kind = "chat", title = null) {
  const [r] = await db.query(
    "INSERT INTO work_messages (conversation_id, role, kind, title, content) VALUES (?, ?, ?, ?, ?)",
    [conversationId, role, kind, title, content]
  );
  await touchConversation(conversationId);
  return r.insertId;
}

async function getMessages(conversationId, limit = 500) {
  const [rows] = await db.query(
    "SELECT id, role, kind, title, content, created_at FROM work_messages WHERE conversation_id = ? ORDER BY id ASC LIMIT ?",
    [conversationId, limit]
  );
  return rows;
}

async function getRecentMessages(conversationId, limit = 12) {
  const [rows] = await db.query(
    "SELECT role, content FROM (SELECT id, role, content FROM work_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT ?) t ORDER BY id ASC",
    [conversationId, limit]
  );
  return rows;
}

async function addDocument(conversationId, userId, fileName, fileType, text) {
  const [r] = await db.query(
    "INSERT INTO work_documents (conversation_id, user_id, file_name, file_type, extracted_text) VALUES (?, ?, ?, ?, ?)",
    [conversationId, userId, fileName.slice(0, 255), fileType, text]
  );
  await touchConversation(conversationId);
  return r.insertId;
}

async function getDocuments(conversationId, userId, withText = false) {
  const [rows] = await db.query(
    `SELECT id, file_name, file_type, created_at${withText ? ", extracted_text" : ""}
       FROM work_documents WHERE conversation_id = ? AND user_id = ? ORDER BY id ASC`,
    [conversationId, userId]
  );
  return rows;
}

async function renameConversation(id, title) {
  await db.query("UPDATE work_conversations SET title = ? WHERE id = ?", [title.slice(0, 200), id]);
}

module.exports = {
  ensureWorkTables, createConversation, getConversation, listConversations,
  deleteConversation, addMessage, getMessages, getRecentMessages,
  addDocument, getDocuments, renameConversation,
};
