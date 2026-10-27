-- Additive, idempotent. Run once (or let server startup ensureCollaborationTables() do it).
CREATE TABLE IF NOT EXISTS case_collaborations (
  id INT NOT NULL AUTO_INCREMENT,
  case_id INT NOT NULL,
  owner_id INT NOT NULL,
  advocate_id INT NOT NULL,
  appointment_id INT DEFAULT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending | active | declined | ended_by_user
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL DEFAULT NULL,
  ended_at TIMESTAMP NULL DEFAULT NULL,
  ended_by INT DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_collab_case_advocate (case_id, advocate_id),
  INDEX idx_collab_owner (owner_id),
  INDEX idx_collab_advocate_status (advocate_id, status),
  CONSTRAINT fk_collab_case FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
  CONSTRAINT fk_collab_owner FOREIGN KEY (owner_id) REFERENCES users(id),
  CONSTRAINT fk_collab_advocate FOREIGN KEY (advocate_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS case_messages (
  id INT NOT NULL AUTO_INCREMENT,
  case_id INT NOT NULL,
  collaboration_id INT NOT NULL,
  sender_id INT NOT NULL,
  sender_role VARCHAR(20) NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_cmsg_collab (collaboration_id, id),
  CONSTRAINT fk_cmsg_collab FOREIGN KEY (collaboration_id) REFERENCES case_collaborations(id) ON DELETE CASCADE,
  CONSTRAINT fk_cmsg_sender FOREIGN KEY (sender_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS case_message_reads (
  collaboration_id INT NOT NULL,
  user_id INT NOT NULL,
  last_read_id INT NOT NULL DEFAULT 0,
  PRIMARY KEY (collaboration_id, user_id),
  CONSTRAINT fk_cread_collab FOREIGN KEY (collaboration_id) REFERENCES case_collaborations(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS case_versions (
  id INT NOT NULL AUTO_INCREMENT,
  case_id INT NOT NULL,
  collaboration_id INT DEFAULT NULL,
  field_name VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by INT NOT NULL,
  changed_by_role VARCHAR(20) NOT NULL,
  change_description TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_cver_case (case_id, id),
  CONSTRAINT fk_cver_case FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS advocate_reports (
  id INT NOT NULL AUTO_INCREMENT,
  report_code VARCHAR(30) NOT NULL,
  reporter_id INT NOT NULL,
  advocate_id INT NOT NULL,
  case_id INT NOT NULL,
  collaboration_id INT NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  evidence_note TEXT DEFAULT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'submitted', -- submitted | under_review | resolved | dismissed
  management_notes TEXT DEFAULT NULL,
  reviewed_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_report_code (report_code),
  INDEX idx_report_reporter (reporter_id),
  INDEX idx_report_status (status),
  CONSTRAINT fk_report_reporter FOREIGN KEY (reporter_id) REFERENCES users(id),
  CONSTRAINT fk_report_advocate FOREIGN KEY (advocate_id) REFERENCES users(id),
  CONSTRAINT fk_report_collab FOREIGN KEY (collaboration_id) REFERENCES case_collaborations(id)
);
