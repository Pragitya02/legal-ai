const db = require("../db");

/*
=========================================================
AUDIT SERVICE
=========================================================
*/

async function logAudit({
    userId = null,
    action,
    entityType = null,
    entityId = null,
    description = null,
    req = null,
    metadata = null
}) {
    try {

        // -------------------------------------------------
        // GET REQUEST INFORMATION
        // -------------------------------------------------

        const ipAddress = req
            ? (
                req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
                || req.socket?.remoteAddress
                || null
            )
            : null;

        const userAgent = req
            ? req.headers["user-agent"] || null
            : null;

        // -------------------------------------------------
        // INSERT AUDIT LOG
        // -------------------------------------------------

        await db.query(
            `
            INSERT INTO audit_logs
            (
                user_id,
                action,
                entity_type,
                entity_id,
                description,
                ip_address,
                user_agent,
                metadata
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                userId,
                action,
                entityType,
                entityId !== null
                    ? String(entityId)
                    : null,
                description,
                ipAddress,
                userAgent,
                metadata
                    ? JSON.stringify(metadata)
                    : null
            ]
        );

        console.log(
            "AUDIT LOG CREATED:",
            action,
            entityType,
            entityId
        );

    } catch (error) {

        /*
        -------------------------------------------------
        AUDIT FAILURE SHOULD NOT BREAK THE MAIN REQUEST
        -------------------------------------------------
        */

        console.error(
            "AUDIT LOG ERROR:",
            error.message
        );
    }
}

module.exports = {
    logAudit
};