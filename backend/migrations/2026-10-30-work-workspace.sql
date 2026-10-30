-- Work (general-purpose AI workspace). Also created idempotently at startup by database/workModel.js.
CREATE TABLE IF NOT EXISTS work_conversations (
  id INT NOT NULL AUTO_INCREMENT,
  user_id INT NOT NULL,
  title VARCHAR(200) NOT NULL DEFAULT 'New Chat',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_work_conv_user (user_id, updated_at)
);
CREATE TABLE IF NOT EXISTS work_messages (
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
);
CREATE TABLE IF NOT EXISTS work_documents (
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
);
