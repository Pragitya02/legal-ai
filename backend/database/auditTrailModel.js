const db = require("../db");

async function ensureAuditTrailTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT NOT NULL AUTO_INCREMENT,

                user_id INT DEFAULT NULL,

                action VARCHAR(100) NOT NULL,

                entity_type VARCHAR(100) DEFAULT NULL,

                entity_id VARCHAR(100) DEFAULT NULL,

                description TEXT DEFAULT NULL,

                ip_address VARCHAR(45) DEFAULT NULL,

                user_agent TEXT DEFAULT NULL,

                metadata JSON DEFAULT NULL,

                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                PRIMARY KEY (id),

                INDEX idx_audit_user (user_id),
                INDEX idx_audit_action (action),
                INDEX idx_audit_entity (entity_type, entity_id),
                INDEX idx_audit_created (created_at),

                CONSTRAINT fk_audit_user
                    FOREIGN KEY (user_id)
                    REFERENCES users(id)
                    ON DELETE SET NULL
            )
        `);

        console.log("AUDIT TRAIL TABLE READY");

    } catch (error) {
        console.error(
            "FAILED TO CREATE AUDIT TRAIL TABLE:",
            error.message
        );
    }
}

module.exports = {
    ensureAuditTrailTable
};