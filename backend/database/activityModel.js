const db = require("../db");

async function ensureActivityTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_activity (
      id BIGINT NOT NULL AUTO_INCREMENT,
      user_id INT NOT NULL,
      action VARCHAR(80) NOT NULL,
      description VARCHAR(500) NOT NULL,
      entity_type VARCHAR(50) DEFAULT NULL,
      entity_id BIGINT DEFAULT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'completed',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_user_activity_user_created (user_id, created_at),
      CONSTRAINT fk_user_activity_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log("USER ACTIVITY TABLE READY");
}

async function recordActivity({ userId, action, description, entityType = null, entityId = null, status = "completed" }) {
  if (!userId || !action || !description) return;
  try {
    await db.query(
      `INSERT INTO user_activity (user_id, action, description, entity_type, entity_id, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [Number(userId), String(action).slice(0, 80), String(description).slice(0, 500), entityType, entityId, status]
    );
  } catch (error) {
    // Activity logging must not turn a successful business operation into a failure.
    console.error("ACTIVITY LOG ERROR:", error.message);
  }
}

module.exports = { ensureActivityTable, recordActivity };
