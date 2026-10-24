/*
=====================================================
NYAYA AI - DOCUMENT SHARE MODEL

The document_shares table is created in the production
MySQL database by the deployment SQL. This module only
contains the data-access helpers used by the share routes.
=====================================================
*/

const db = require("../db");

function normalizeShareType(value) {
    const type = String(value || "").trim().toLowerCase();

    if (type === "temporary") {
        return "temporary";
    }

    return "permanent";
}

function normalizeStatus(value) {
    return String(value || "").trim().toLowerCase();
}

async function expireDueShares() {
    await db.query(
        `
        UPDATE document_shares
        SET status = 'expired'
        WHERE status IN ('pending', 'accepted')
          AND expires_at IS NOT NULL
          AND expires_at <= NOW()
        `
    );
}

async function createShare({
    documentId,
    senderId,
    recipientId,
    shareType,
    durationDays = null
}) {
    const normalizedType =
        normalizeShareType(shareType);

    let expiresAt = null;

    if (normalizedType === "temporary") {
        const days = Number(durationDays);

        if (
            !Number.isInteger(days) ||
            days < 1 ||
            days > 365
        ) {
            throw new Error(
                "Temporary sharing duration must be between 1 and 365 days."
            );
        }

        expiresAt = new Date(
            Date.now() + days * 24 * 60 * 60 * 1000
        );
    }

    const [result] = await db.query(
        `
        INSERT INTO document_shares
        (
            document_id,
            sender_id,
            recipient_id,
            share_type,
            duration_days,
            expires_at,
            status
        )
        VALUES (?, ?, ?, ?, ?, ?, 'pending')
        `,
        [
            documentId,
            senderId,
            recipientId,
            normalizedType,
            normalizedType === "temporary"
                ? Number(durationDays)
                : null,
            expiresAt
        ]
    );

    return result.insertId;
}

async function getShareById(shareId) {
    const [rows] = await db.query(
        `
        SELECT
            ds.id,
            ds.document_id,
            ds.sender_id,
            ds.recipient_id,
            ds.share_type,
            ds.duration_days,
            ds.expires_at,
            ds.status,
            ds.created_at,
            ds.accepted_at,
            ds.rejected_at,
            ds.revoked_at,
            d.file_name,
            d.file_path,
            d.file_type,
            sender.full_name AS sender_name,
            sender.email AS sender_email,
            recipient.full_name AS recipient_name,
            recipient.email AS recipient_email
        FROM document_shares ds
        INNER JOIN documents d
            ON d.id = ds.document_id
        INNER JOIN users sender
            ON sender.id = ds.sender_id
        INNER JOIN users recipient
            ON recipient.id = ds.recipient_id
        WHERE ds.id = ?
        LIMIT 1
        `,
        [shareId]
    );

    return rows[0] || null;
}

async function listIncomingShares(userId) {
    await expireDueShares();

    const [rows] = await db.query(
        `
        SELECT
            ds.id,
            ds.document_id,
            ds.sender_id,
            ds.recipient_id,
            ds.share_type,
            ds.duration_days,
            ds.expires_at,
            ds.status,
            ds.created_at,
            ds.accepted_at,
            ds.rejected_at,
            ds.revoked_at,
            d.file_name,
            d.file_type,
            d.uploaded_at,
            sender.full_name AS sender_name,
            sender.email AS sender_email
        FROM document_shares ds
        INNER JOIN documents d
            ON d.id = ds.document_id
        INNER JOIN users sender
            ON sender.id = ds.sender_id
        WHERE ds.recipient_id = ?
          AND ds.status IN ('pending', 'accepted')
          AND (
              ds.expires_at IS NULL
              OR ds.expires_at > NOW()
          )
        ORDER BY ds.created_at DESC
        `,
        [userId]
    );

    return rows;
}

async function listOutgoingShares(userId) {
    await expireDueShares();

    const [rows] = await db.query(
        `
        SELECT
            ds.id,
            ds.document_id,
            ds.sender_id,
            ds.recipient_id,
            ds.share_type,
            ds.duration_days,
            ds.expires_at,
            ds.status,
            ds.created_at,
            ds.accepted_at,
            ds.rejected_at,
            ds.revoked_at,
            d.file_name,
            d.file_type,
            recipient.full_name AS recipient_name,
            recipient.email AS recipient_email
        FROM document_shares ds
        INNER JOIN documents d
            ON d.id = ds.document_id
        INNER JOIN users recipient
            ON recipient.id = ds.recipient_id
        WHERE ds.sender_id = ?
        ORDER BY ds.created_at DESC
        `,
        [userId]
    );

    return rows;
}

async function updateShareStatus(
    shareId,
    status,
    userId
) {
    const normalizedStatus =
        normalizeStatus(status);

    if (
        ![
            "accepted",
            "rejected",
            "revoked"
        ].includes(normalizedStatus)
    ) {
        throw new Error("Invalid share status.");
    }

    let sql = "";
    let params = [];

    if (normalizedStatus === "accepted") {
        sql = `
            UPDATE document_shares
            SET
                status = 'accepted',
                accepted_at = NOW()
            WHERE id = ?
              AND recipient_id = ?
              AND status = 'pending'
              AND (
                  expires_at IS NULL
                  OR expires_at > NOW()
              )
        `;

        params = [shareId, userId];
    } else if (normalizedStatus === "rejected") {
        sql = `
            UPDATE document_shares
            SET
                status = 'rejected',
                rejected_at = NOW()
            WHERE id = ?
              AND recipient_id = ?
              AND status = 'pending'
        `;

        params = [shareId, userId];
    } else {
        sql = `
            UPDATE document_shares
            SET
                status = 'revoked',
                revoked_at = NOW()
            WHERE id = ?
              AND sender_id = ?
              AND status IN ('pending', 'accepted')
        `;

        params = [shareId, userId];
    }

    const [result] = await db.query(
        sql,
        params
    );

    return result.affectedRows > 0;
}


async function removeIncomingShare(shareId, userId) {
    const [result] = await db.query(
        `
        DELETE FROM document_shares
        WHERE id = ?
          AND recipient_id = ?
          AND status IN (
              'pending',
              'accepted',
              'rejected',
              'expired',
              'revoked'
          )
        `,
        [shareId, userId]
    );

    return result.affectedRows > 0;
}


module.exports = {
    normalizeShareType,
    createShare,
    getShareById,
    listIncomingShares,
    listOutgoingShares,
    updateShareStatus,
    removeIncomingShare,
    expireDueShares
};
