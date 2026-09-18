const db = require("../db");

/*
=====================================================
AUDIT LOG MODEL

Centralized audit logging for security-sensitive
document and account actions.

This model intentionally fails safely:
audit logging must never break the main user action.
=====================================================
*/


// =====================================================
// ENSURE AUDIT LOGS TABLE
// =====================================================

async function ensureAuditLogsTable() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (

                id INT NOT NULL AUTO_INCREMENT,

                user_id INT DEFAULT NULL,

                entity_type VARCHAR(50) NOT NULL,

                entity_id INT DEFAULT NULL,

                action VARCHAR(100) NOT NULL,

                description TEXT NOT NULL,

                ip_address VARCHAR(45) DEFAULT NULL,

                user_agent TEXT DEFAULT NULL,

                metadata JSON DEFAULT NULL,

                created_at TIMESTAMP NOT NULL
                    DEFAULT CURRENT_TIMESTAMP,

                PRIMARY KEY (id),

                INDEX idx_audit_entity (
                    entity_type,
                    entity_id
                ),

                INDEX idx_audit_user (
                    user_id
                ),

                INDEX idx_audit_action (
                    action
                ),

                INDEX idx_audit_created (
                    created_at
                ),

                CONSTRAINT fk_audit_logs_user
                    FOREIGN KEY (user_id)
                    REFERENCES users(id)
                    ON DELETE SET NULL
            )
        `);

        console.log("AUDIT LOGS TABLE READY");

    } catch (error) {

        console.error(
            "FAILED TO CREATE AUDIT LOGS TABLE:",
            error.message
        );

        /*
         * Do not throw here.
         *
         * Audit logging must not prevent the application
         * from starting if the audit table cannot be created.
         */
    }
}


// =====================================================
// LOG DOCUMENT ACTIVITY
// =====================================================

async function logDocumentActivity({
    documentId = null,
    userId = null,
    action,
    req = null,
    metadata = null
}) {

    try {

        if (!action) {
            console.error(
                "AUDIT LOG SKIPPED: action is required."
            );

            return;
        }


        /*
         * Build a human-readable description from the
         * action and available metadata.
         */

        const descriptions = {
            document_uploaded:
                "Document uploaded",

            document_viewed:
                "Document viewed",

            document_downloaded:
                "Document downloaded",

            document_deleted:
                "Document deleted",

            blockchain_verified:
                "Blockchain verification performed",

            document_security_changed:
                "Document security settings changed"
        };

        const description =
            descriptions[action] ||
            action.replace(/_/g, " ");


        /*
         * Safely obtain request information.
         */

        let ipAddress = null;
        let userAgent = null;

        if (req) {

            const forwardedFor =
                req.headers &&
                req.headers["x-forwarded-for"];

            if (forwardedFor) {

                ipAddress =
                    String(forwardedFor)
                        .split(",")[0]
                        .trim();

            } else if (req.ip) {

                ipAddress = req.ip;

            }


            if (
                req.headers &&
                req.headers["user-agent"]
            ) {

                userAgent =
                    String(
                        req.headers["user-agent"]
                    ).slice(0, 2000);

            }

        }


        /*
         * MySQL JSON column accepts a JSON string.
         *
         * null remains SQL NULL.
         */

        let metadataValue = null;

        if (
            metadata !== null &&
            metadata !== undefined
        ) {

            try {

                metadataValue =
                    JSON.stringify(metadata);

            } catch (serializationError) {

                console.error(
                    "AUDIT METADATA SERIALIZATION ERROR:",
                    serializationError.message
                );

                metadataValue = null;
            }
        }


        await db.query(
            `
            INSERT INTO audit_logs (
                user_id,
                entity_type,
                entity_id,
                action,
                description,
                ip_address,
                user_agent,
                metadata
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                userId || null,
                "document",
                documentId || null,
                action,
                description,
                ipAddress,
                userAgent,
                metadataValue
            ]
        );

    } catch (error) {

        /*
         * IMPORTANT:
         *
         * Audit logging must NEVER cause a document
         * upload/view/download/delete/verification
         * operation to fail.
         */

        console.error(
            "AUDIT LOG ERROR:",
            error.message
        );
    }
}


// =====================================================
// EXPORT
// =====================================================

module.exports = {
    ensureAuditLogsTable,
    logDocumentActivity
};