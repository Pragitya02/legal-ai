/*
=====================================================
NYAYA AI - AUDIT LOG MODEL

Centralized audit logging for security-sensitive
document and account actions.

IMPORTANT:
The database module is loaded lazily inside the
functions below.

This avoids a circular dependency during application
startup where `db` could otherwise be an incomplete
module.exports object.

Audit logging intentionally fails safely:
audit logging must NEVER break the main application
operation.
=====================================================
*/


// =====================================================
// GET DATABASE CONNECTION
// =====================================================
//
// IMPORTANT:
// Do NOT require ../db at the top of this file.
//
// Some parts of the backend load database models while
// the database module is still being initialized.
// Loading ../db lazily prevents:
//     db.query is not a function
//
// from circular module initialization.
// =====================================================

function getDatabase() {

    const database = require("../db");

    if (
        !database ||
        typeof database.query !== "function"
    ) {
        throw new Error(
            "Database connection is not initialized correctly."
        );
    }

    return database;
}


// =====================================================
// ENSURE AUDIT LOGS TABLE
// =====================================================

async function ensureAuditLogsTable() {

    try {

        const db = getDatabase();

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

        console.log(
            "AUDIT LOGS TABLE READY"
        );

    } catch (error) {

        console.error(
            "FAILED TO CREATE AUDIT LOGS TABLE:",
            error.message
        );

        /*
         * IMPORTANT:
         *
         * Do not throw here.
         *
         * Audit logging must never prevent the
         * application from starting.
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

        // -------------------------------------------------
        // VALIDATE ACTION
        // -------------------------------------------------

        if (
            typeof action !== "string" ||
            !action.trim()
        ) {

            console.error(
                "AUDIT LOG SKIPPED: action is required."
            );

            return;
        }


        // -------------------------------------------------
        // GET DATABASE
        // -------------------------------------------------

        const db = getDatabase();


        // -------------------------------------------------
        // HUMAN-READABLE DESCRIPTIONS
        // -------------------------------------------------

        const descriptions = {

            document_uploaded:
                "Document uploaded",

            document_viewed:
                "Document viewed",

            document_downloaded:
                "Document downloaded",

            document_deleted:
                "Document deleted",

            document_renamed:
                "Document renamed",

            blockchain_registered:
                "Document registered on blockchain",

            blockchain_verified:
                "Blockchain verification performed",

            document_security_changed:
                "Document security settings changed"

        };


        const normalizedAction =
            action.trim();


        const description =
            descriptions[normalizedAction] ||
            normalizedAction.replace(
                /_/g,
                " "
            );


        // -------------------------------------------------
        // REQUEST INFORMATION
        // -------------------------------------------------

        let ipAddress = null;

        let userAgent = null;


        if (req) {

            /*
             * Render / reverse proxy may provide the
             * original client IP through x-forwarded-for.
             */

            const forwardedFor =
                req.headers &&
                req.headers["x-forwarded-for"];


            if (forwardedFor) {

                ipAddress =
                    String(forwardedFor)
                        .split(",")[0]
                        .trim();

            } else if (req.ip) {

                ipAddress =
                    String(req.ip)
                        .trim();

            }


            /*
             * User-Agent is limited to avoid storing
             * unexpectedly large values.
             */

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


        // -------------------------------------------------
        // VALIDATE / NORMALIZE USER ID
        // -------------------------------------------------

        let safeUserId = null;

        if (
            userId !== null &&
            userId !== undefined &&
            userId !== ""
        ) {

            const numericUserId =
                Number(userId);

            if (
                Number.isInteger(
                    numericUserId
                ) &&
                numericUserId > 0
            ) {

                safeUserId =
                    numericUserId;

            }

        }


        // -------------------------------------------------
        // VALIDATE / NORMALIZE DOCUMENT ID
        // -------------------------------------------------

        let safeDocumentId = null;

        if (
            documentId !== null &&
            documentId !== undefined &&
            documentId !== ""
        ) {

            const numericDocumentId =
                Number(documentId);

            if (
                Number.isInteger(
                    numericDocumentId
                ) &&
                numericDocumentId > 0
            ) {

                safeDocumentId =
                    numericDocumentId;

            }

        }


        // -------------------------------------------------
        // SERIALIZE METADATA
        // -------------------------------------------------
        //
        // MySQL JSON columns can receive a JSON string.
        //
        // null remains SQL NULL.
        // -------------------------------------------------

        let metadataValue = null;


        if (
            metadata !== null &&
            metadata !== undefined
        ) {

            try {

                metadataValue =
                    JSON.stringify(
                        metadata
                    );

            } catch (
                serializationError
            ) {

                console.error(
                    "AUDIT METADATA SERIALIZATION ERROR:",
                    serializationError.message
                );

                metadataValue = null;

            }

        }


        // -------------------------------------------------
        // INSERT AUDIT RECORD
        // -------------------------------------------------

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

                safeUserId,

                "document",

                safeDocumentId,

                normalizedAction,

                description,

                ipAddress,

                userAgent,

                metadataValue

            ]
        );


    } catch (error) {

        /*
         * CRITICAL SAFETY RULE:
         *
         * Audit logging must NEVER cause the original
         * document operation to fail.
         *
         * Therefore we log the error and return.
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