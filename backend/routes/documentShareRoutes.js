const express = require("express");
const fs = require("fs");
const path = require("path");

const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const {
    createShare,
    getShareById,
    listIncomingShares,
    listOutgoingShares,
    updateShareStatus,
    removeIncomingShare,
    expireDueShares
} = require("../database/documentShareModel");
const {
    isSupabaseStorageReference,
    downloadDocumentBuffer
} = require("../services/supabaseStorageService");
const { logDocumentActivity } = require("../database/auditLogModel");
const { createNotification } = require("./notificationRoutes");

const router = express.Router();

const UPLOAD_DIR =
    process.env.UPLOAD_DIR ||
    path.join(__dirname, "..", "uploads");

function getPhysicalFilePath(filePath) {
    if (!filePath) {
        return null;
    }

    const fileName = path.basename(filePath);

    if (!fileName) {
        return null;
    }

    return path.join(UPLOAD_DIR, fileName);
}

function normalizeSupabaseReference(filePath) {
    if (!filePath || typeof filePath !== "string") {
        return null;
    }

    const value = filePath.trim();

    if (isSupabaseStorageReference(value)) {
        return value;
    }

    // Support a full Supabase Storage object URL from older records.
    if (
        value.startsWith("http://") ||
        value.startsWith("https://")
    ) {
        try {
            const url = new URL(value);
            const marker = "/storage/v1/object/";
            const index = url.pathname.indexOf(marker);

            if (index >= 0) {
                const remainder = url.pathname.slice(
                    index + marker.length
                );

                const parts = remainder
                    .split("/")
                    .filter(Boolean);

                if (parts.length >= 2) {
                    const bucket = decodeURIComponent(parts[0]);

                    const configuredBucket =
                        process.env.SUPABASE_STORAGE_BUCKET ||
                        "nyaya-documents";

                    if (bucket === configuredBucket) {
                        const objectPath = parts
                            .slice(1)
                            .map((part) => decodeURIComponent(part))
                            .join("/");

                        if (
                            objectPath &&
                            !objectPath.includes("..")
                        ) {
                            return `supabase://${objectPath}`;
                        }
                    }
                }
            }
        } catch {
            return null;
        }
    }

    // Support raw object paths produced by the current storage layout.
    if (
        value.startsWith("documents/") &&
        !value.includes("..")
    ) {
        return `supabase://${value}`;
    }

    return null;
}

/*
 * The documents table is the source of truth for the current
 * physical/storage location of the document.
 *
 * A document share can contain an older file_path, so we refresh
 * the path from documents before attempting to read the file.
 */
async function getCurrentDocumentFilePath(documentId) {
    if (!documentId) {
        return null;
    }

    const [rows] = await db.query(
        `
        SELECT file_path
        FROM documents
        WHERE id = ?
        LIMIT 1
        `,
        [documentId]
    );

    if (!rows || rows.length === 0) {
        return null;
    }

    return rows[0].file_path || null;
}

async function loadSharedDocumentBuffer(
    filePath,
    documentId
) {
    let currentFilePath = filePath;

    /*
     * Prefer the current file_path from documents.
     *
     * This prevents an old/stale document_shares path from
     * breaking access after the document has been moved to
     * Supabase Storage.
     */
    try {
        const databaseFilePath =
            await getCurrentDocumentFilePath(documentId);

        if (databaseFilePath) {
            currentFilePath = databaseFilePath;
        }
    } catch (lookupError) {
        console.error(
            "SHARED DOCUMENT PATH LOOKUP ERROR:",
            lookupError.message
        );
    }

    /*
     * Supabase Storage
     */
    const normalizedReference =
        normalizeSupabaseReference(currentFilePath);

    if (normalizedReference) {
        return downloadDocumentBuffer(
            normalizedReference
        );
    }

    /*
     * Legacy/local filesystem fallback.
     */
    const physicalPath =
        getPhysicalFilePath(currentFilePath);

    if (
        !physicalPath ||
        !fs.existsSync(physicalPath)
    ) {
        const error = new Error(
            "Document file is no longer available."
        );

        error.code = "DOCUMENT_FILE_NOT_FOUND";
        throw error;
    }

    return fs.promises.readFile(physicalPath);
}

function normalizeRole(value) {
    return String(value || "")
        .trim()
        .toLowerCase();
}

function isAdvocateRole(role) {
    const normalized = normalizeRole(role);

    return (
        normalized === "lawyer" ||
        normalized === "advocate"
    );
}

function isCitizenRole(role) {
    return normalizeRole(role) === "citizen";
}

function canShareBetweenRoles(
    senderRole,
    recipientRole
) {
    return (
        (isCitizenRole(senderRole) &&
            isAdvocateRole(recipientRole)) ||
        (isAdvocateRole(senderRole) &&
            isCitizenRole(recipientRole))
    );
}

function formatShare(row) {
    return {
        id: row.id,
        documentId: row.document_id,
        fileName: row.file_name,
        fileType: row.file_type,
        senderId: row.sender_id,
        recipientId: row.recipient_id,
        senderName: row.sender_name || null,
        senderEmail: row.sender_email || null,
        recipientName: row.recipient_name || null,
        recipientEmail: row.recipient_email || null,
        shareType: row.share_type,
        durationDays:
            row.duration_days === null ||
            row.duration_days === undefined
                ? null
                : Number(row.duration_days),
        expiresAt: row.expires_at || null,
        status: row.status,
        createdAt: row.created_at,
        acceptedAt: row.accepted_at || null,
        rejectedAt: row.rejected_at || null,
        revokedAt: row.revoked_at || null
    };
}

async function getConfirmedRelationship(
    userId,
    otherUserId
) {
    const [rows] = await db.query(
        `
        SELECT id
        FROM appointments
        WHERE status = 'confirmed'
          AND (
              (
                  citizen_id = ?
                  AND lawyer_id = ?
              )
              OR
              (
                  citizen_id = ?
                  AND lawyer_id = ?
              )
          )
        LIMIT 1
        `,
        [
            userId,
            otherUserId,
            otherUserId,
            userId
        ]
    );

    return rows[0] || null;
}

async function getUserById(userId) {
    const [rows] = await db.query(
        `
        SELECT
            id,
            full_name,
            email,
            role
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [userId]
    );

    return rows[0] || null;
}

// =====================================================
// GET ELIGIBLE SHARE RECIPIENTS
// =====================================================
//
// Only users connected through a confirmed appointment are
// returned. This works in both directions:
//
// citizen -> advocate
// advocate -> citizen
//
// =====================================================

router.get(
    "/recipients",
    authMiddleware,
    async (req, res) => {
        try {
            const userId = req.user.id;
            const role = normalizeRole(req.user.role);

            if (
                !isCitizenRole(role) &&
                !isAdvocateRole(role)
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only citizen and advocate accounts can share documents."
                });
            }

            const targetRole =
                isCitizenRole(role)
                    ? "lawyer"
                    : "citizen";

            const [rows] = await db.query(
                `
                SELECT DISTINCT
                    u.id,
                    u.full_name,
                    u.email,
                    u.role
                FROM appointments a
                INNER JOIN users u
                    ON u.id = CASE
                        WHEN a.citizen_id = ?
                            THEN a.lawyer_id
                        ELSE a.citizen_id
                    END
                WHERE a.status = 'confirmed'
                  AND (
                      a.citizen_id = ?
                      OR a.lawyer_id = ?
                  )
                  AND u.role = ?
                ORDER BY u.full_name ASC
                `,
                [
                    userId,
                    userId,
                    userId,
                    targetRole
                ]
            );

            return res.json({
                success: true,
                recipients: rows.map((row) => ({
                    id: row.id,
                    name: row.full_name,
                    email: row.email,
                    role: row.role
                }))
            });
        } catch (error) {
            console.error(
                "GET DOCUMENT SHARE RECIPIENTS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load eligible document recipients."
            });
        }
    }
);

// =====================================================
// LIST SHARES
// =====================================================

router.get(
    "/",
    authMiddleware,
    async (req, res) => {
        try {
            await expireDueShares();

            const incoming =
                await listIncomingShares(req.user.id);

            const outgoing =
                await listOutgoingShares(req.user.id);

            return res.json({
                success: true,
                incoming: incoming.map(formatShare),
                outgoing: outgoing.map(formatShare)
            });
        } catch (error) {
            console.error(
                "GET DOCUMENT SHARES ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load shared documents."
            });
        }
    }
);

// =====================================================
// CREATE SHARE
// POST /api/document-shares
// =====================================================

router.post(
    "/",
    authMiddleware,
    async (req, res) => {
        try {
            const senderId = req.user.id;

            const senderRole = normalizeRole(
                req.user.role
            );

            const documentId = Number(
                req.body?.documentId
            );

            const recipientId = Number(
                req.body?.recipientId
            );

            const shareType = String(
                req.body?.shareType || ""
            )
                .trim()
                .toLowerCase();

            const durationDays =
                req.body?.durationDays;

            if (
                !Number.isInteger(documentId) ||
                documentId <= 0 ||
                !Number.isInteger(recipientId) ||
                recipientId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Valid document and recipient are required."
                });
            }

            if (
                shareType !== "permanent" &&
                shareType !== "temporary"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Share type must be permanent or temporary."
                });
            }

            if (senderId === recipientId) {
                return res.status(400).json({
                    success: false,
                    message:
                        "A document cannot be shared with yourself."
                });
            }

            if (
                !isCitizenRole(senderRole) &&
                !isAdvocateRole(senderRole)
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only citizen and advocate accounts can share documents."
                });
            }

            // -------------------------------------------------
            // VERIFY DOCUMENT OWNERSHIP
            // -------------------------------------------------

            const [documents] = await db.query(
                `
                SELECT
                    id,
                    user_id,
                    file_name
                FROM documents
                WHERE id = ?
                  AND user_id = ?
                LIMIT 1
                `,
                [documentId, senderId]
            );

            if (documents.length === 0) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Document not found."
                });
            }

            const document = documents[0];

            // -------------------------------------------------
            // VERIFY RECIPIENT
            // -------------------------------------------------

            const recipient =
                await getUserById(recipientId);

            if (!recipient) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Recipient not found."
                });
            }

            if (
                !canShareBetweenRoles(
                    senderRole,
                    recipient.role
                )
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Documents can only be shared between citizens and advocates."
                });
            }

            // -------------------------------------------------
            // VERIFY CONFIRMED BOOKING
            // -------------------------------------------------

            const relationship =
                await getConfirmedRelationship(
                    senderId,
                    recipientId
                );

            if (!relationship) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You can only share documents with an advocate or client who has a confirmed consultation with you."
                });
            }

            // -------------------------------------------------
            // PREVENT DUPLICATE ACTIVE SHARE
            // -------------------------------------------------

            await expireDueShares();

            const [existing] = await db.query(
                `
                SELECT id
                FROM document_shares
                WHERE document_id = ?
                  AND sender_id = ?
                  AND recipient_id = ?
                  AND status IN ('pending', 'accepted')
                  AND (
                      expires_at IS NULL
                      OR expires_at > NOW()
                  )
                LIMIT 1
                `,
                [
                    documentId,
                    senderId,
                    recipientId
                ]
            );

            if (existing.length > 0) {
                return res.status(409).json({
                    success: false,
                    message:
                        "This document is already shared with this user. Revoke the existing share before creating another one."
                });
            }

            // -------------------------------------------------
            // CREATE SHARE
            // -------------------------------------------------

            const shareId = await createShare({
                documentId,
                senderId,
                recipientId,
                shareType,
                durationDays
            });

            await logDocumentActivity({
                documentId,
                userId: senderId,
                action: "document_shared",
                req,
                metadata: {
                    shareId,
                    recipientId,
                    recipientName:
                        recipient.full_name,
                    shareType,
                    durationDays:
                        shareType === "temporary"
                            ? Number(durationDays)
                            : null
                }
            });

            await createNotification({
                userId: recipientId,
                type: "document_share_request",
                title: "Document share request",
                message:
                    `${req.user.full_name || "A user"} shared ${document.file_name} with you. Review the request in Shared Documents.`,
                relatedId: shareId
            });

            return res.status(201).json({
                success: true,
                message:
                    "Document share request sent.",
                shareId
            });
        } catch (error) {
            console.error(
                "CREATE DOCUMENT SHARE ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Unable to share document."
            });
        }
    }
);

// =====================================================
// ACCEPT / REJECT SHARE
// PATCH /api/document-shares/:id/respond
// =====================================================

router.patch(
    "/:id/respond",
    authMiddleware,
    async (req, res) => {
        try {
            const shareId = Number(
                req.params.id
            );

            const action = String(
                req.body?.action || ""
            )
                .trim()
                .toLowerCase();

            if (
                !Number.isInteger(shareId) ||
                shareId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid share ID."
                });
            }

            if (
                action !== "accept" &&
                action !== "reject"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Action must be accept or reject."
                });
            }

            await expireDueShares();

            const share =
                await getShareById(shareId);

            if (!share) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Share request not found."
                });
            }

            if (
                share.recipient_id !==
                req.user.id
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You are not the recipient of this share request."
                });
            }

            const newStatus =
                action === "accept"
                    ? "accepted"
                    : "rejected";

            const changed =
                await updateShareStatus(
                    shareId,
                    newStatus,
                    req.user.id
                );

            if (!changed) {
                return res.status(409).json({
                    success: false,
                    message:
                        action === "accept"
                            ? "This share request has expired or has already been handled."
                            : "This share request has already been handled."
                });
            }

            await logDocumentActivity({
                documentId: share.document_id,
                userId: req.user.id,
                action:
                    action === "accept"
                        ? "document_share_accepted"
                        : "document_share_rejected",
                req,
                metadata: {
                    shareId,
                    senderId: share.sender_id
                }
            });

            await createNotification({
                userId: share.sender_id,
                type:
                    action === "accept"
                        ? "document_share_accepted"
                        : "document_share_rejected",
                title:
                    action === "accept"
                        ? "Document share accepted"
                        : "Document share rejected",
                message:
                    `${req.user.full_name || "The recipient"} ${action === "accept" ? "accepted" : "rejected"} your document share request for ${share.file_name}.`,
                relatedId: shareId
            });

            return res.json({
                success: true,
                status: newStatus
            });
        } catch (error) {
            console.error(
                "RESPOND DOCUMENT SHARE ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to respond to document share request."
            });
        }
    }
);

// =====================================================
// REMOVE SHARED DOCUMENT
// DELETE /api/document-shares/:id/remove
//
// Recipient removes the shared entry from their list.
// This never deletes the original document.
// =====================================================

router.delete(
    "/:id/remove",
    authMiddleware,
    async (req, res) => {
        try {
            const shareId = Number(
                req.params.id
            );

            if (
                !Number.isInteger(shareId) ||
                shareId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid share ID."
                });
            }

            const share =
                await getShareById(shareId);

            if (!share) {
                return res.status(404).json({
                    success: false,
                    message: "Share not found."
                });
            }

            if (
                share.recipient_id !==
                req.user.id
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only the recipient can remove this shared document."
                });
            }

            const removed =
                await removeIncomingShare(
                    shareId,
                    req.user.id
                );

            if (!removed) {
                return res.status(409).json({
                    success: false,
                    message:
                        "This shared document is no longer available."
                });
            }

            await logDocumentActivity({
                documentId: share.document_id,
                userId: req.user.id,
                action: "shared_document_removed",
                req,
                metadata: {
                    shareId,
                    senderId: share.sender_id
                }
            });

            return res.json({
                success: true,
                message:
                    "Shared document removed from your list."
            });
        } catch (error) {
            console.error(
                "REMOVE SHARED DOCUMENT ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to remove shared document."
            });
        }
    }
);

// =====================================================
// REVOKE SHARE
// DELETE /api/document-shares/:id
// =====================================================

router.delete(
    "/:id",
    authMiddleware,
    async (req, res) => {
        try {
            const shareId = Number(
                req.params.id
            );

            if (
                !Number.isInteger(shareId) ||
                shareId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid share ID."
                });
            }

            const share =
                await getShareById(shareId);

            if (!share) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Share not found."
                });
            }

            if (
                share.sender_id !==
                req.user.id
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only the document owner can revoke this share."
                });
            }

            const changed =
                await updateShareStatus(
                    shareId,
                    "revoked",
                    req.user.id
                );

            if (!changed) {
                return res.status(409).json({
                    success: false,
                    message:
                        "This share has already been revoked or is no longer active."
                });
            }

            await logDocumentActivity({
                documentId: share.document_id,
                userId: req.user.id,
                action: "document_share_revoked",
                req,
                metadata: {
                    shareId,
                    recipientId:
                        share.recipient_id
                }
            });

            await createNotification({
                userId: share.recipient_id,
                type: "document_share_revoked",
                title: "Document access revoked",
                message:
                    `Access to ${share.file_name} has been revoked by the document owner.`,
                relatedId: shareId
            });

            return res.json({
                success: true,
                status: "revoked"
            });
        } catch (error) {
            console.error(
                "REVOKE DOCUMENT SHARE ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to revoke document share."
            });
        }
    }
);

// =====================================================
// OPEN SHARED DOCUMENT
// GET /api/document-shares/:id/content
// =====================================================

router.get(
    "/:id/content",
    authMiddleware,
    async (req, res) => {
        try {
            const shareId = Number(
                req.params.id
            );

            if (
                !Number.isInteger(shareId) ||
                shareId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid share ID."
                });
            }

            await expireDueShares();

            const share =
                await getShareById(shareId);

            if (!share) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Shared document not found."
                });
            }

            if (
                share.recipient_id !==
                req.user.id
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You do not have access to this shared document."
                });
            }

            if (share.status !== "accepted") {
                return res.status(403).json({
                    success: false,
                    message:
                        "Accept the document share before opening it."
                });
            }

            if (
                share.expires_at &&
                new Date(share.expires_at) <=
                    new Date()
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "This document share has expired."
                });
            }

            let fileBuffer;

            try {
                fileBuffer =
                    await loadSharedDocumentBuffer(
                        share.file_path,
                        share.document_id
                    );
            } catch (storageError) {
                console.error(
                    "SHARED DOCUMENT STORAGE ERROR:",
                    storageError.message
                );

                return res.status(404).json({
                    success: false,
                    message:
                        "Document file is no longer available."
                });
            }

            await logDocumentActivity({
                documentId:
                    share.document_id,
                userId: req.user.id,
                action: "shared_document_viewed",
                req,
                metadata: {
                    shareId
                }
            });

            res.setHeader(
                "Content-Type",
                share.file_type ||
                    "application/octet-stream"
            );

            res.setHeader(
                "Content-Disposition",
                `inline; filename="${encodeURIComponent(
                    share.file_name
                )}"`
            );

            return res.send(fileBuffer);
        } catch (error) {
            console.error(
                "OPEN SHARED DOCUMENT ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to open shared document."
            });
        }
    }
);

// =====================================================
// DOWNLOAD SHARED DOCUMENT
// GET /api/document-shares/:id/download
// =====================================================

router.get(
    "/:id/download",
    authMiddleware,
    async (req, res) => {
        try {
            const shareId = Number(
                req.params.id
            );

            if (
                !Number.isInteger(shareId) ||
                shareId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid share ID."
                });
            }

            await expireDueShares();

            const share =
                await getShareById(shareId);

            if (!share) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Shared document not found."
                });
            }

            if (
                share.recipient_id !==
                req.user.id
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "You do not have access to this shared document."
                });
            }

            if (share.status !== "accepted") {
                return res.status(403).json({
                    success: false,
                    message:
                        "Accept the document share before downloading it."
                });
            }

            if (
                share.expires_at &&
                new Date(share.expires_at) <=
                    new Date()
            ) {
                return res.status(403).json({
                    success: false,
                    message:
                        "This document share has expired."
                });
            }

            let fileBuffer;

            try {
                fileBuffer =
                    await loadSharedDocumentBuffer(
                        share.file_path,
                        share.document_id
                    );
            } catch (storageError) {
                console.error(
                    "SHARED DOCUMENT DOWNLOAD STORAGE ERROR:",
                    storageError.message
                );

                return res.status(404).json({
                    success: false,
                    message:
                        "Document file is no longer available."
                });
            }

            await logDocumentActivity({
                documentId:
                    share.document_id,
                userId: req.user.id,
                action:
                    "shared_document_downloaded",
                req,
                metadata: {
                    shareId,
                    fileName:
                        share.file_name
                }
            });

            res.setHeader(
                "Content-Type",
                share.file_type ||
                    "application/octet-stream"
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${encodeURIComponent(
                    share.file_name
                )}"`
            );

            return res.send(fileBuffer);
        } catch (error) {
            console.error(
                "DOWNLOAD SHARED DOCUMENT ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to download shared document."
            });
        }
    }
);

module.exports = router;