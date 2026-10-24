const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");

const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const {
    hashDocument,
    anchorHashOnChain,
    verifyHashOnChain,
    isBlockchainEnabled
} = require("../services/blockchainService");

const { getNetworkName } = require("../utils/blockchainConfig");

const {
    setBlockchainRegistration,
    getDocumentForBlockchain
} = require("../database/documentHashModel");

const {
    logDocumentActivity
} = require("../database/auditLogModel");

const {
    createDocumentStoragePath,
    toStorageReference,
    isSupabaseStorageReference,
    uploadDocumentBuffer,
    downloadDocumentBuffer,
    deleteDocumentFromStorage
} = require("../services/supabaseStorageService");

const router = express.Router();

/* =========================================================
   CONFIGURATION
========================================================= */

const UPLOAD_DIR =
    process.env.UPLOAD_DIR ||
    path.join(__dirname, "..", "uploads");

const MAX_FILE_SIZE = 10 * 1024 * 1024;

/*
 * Keep legacy local storage available for old documents.
 * New uploads are stored in Supabase Storage.
 */
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, {
        recursive: true
    });
}

/* =========================================================
   ALLOWED MIME TYPES
========================================================= */

const ALLOWED_MIME_TYPES = new Set([
    "application/pdf",

    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",

    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/x-m4a",

    "video/mp4",
    "video/quicktime",
    "video/webm"
]);

/* =========================================================
   MULTER
========================================================= */

const storage = multer.memoryStorage();

const upload = multer({
    storage,

    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 1
    },

    fileFilter(req, file, cb) {
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            return cb(
                new Error(
                    "Unsupported file type. Allowed files: PDF, PNG, JPG, WEBP, GIF, MP3, WAV, M4A, MP4, MOV and WEBM."
                )
            );
        }

        cb(null, true);
    }
});

/* =========================================================
   FILE SIGNATURE VALIDATION
========================================================= */

function matchesSignature(
    buffer,
    signature,
    offset = 0
) {
    if (
        !Buffer.isBuffer(buffer) ||
        buffer.length <
            offset + signature.length
    ) {
        return false;
    }

    for (
        let i = 0;
        i < signature.length;
        i++
    ) {
        if (
            buffer[offset + i] !==
            signature[i]
        ) {
            return false;
        }
    }

    return true;
}

function fileSignatureMatchesMimeType(
    buffer,
    mimetype
) {
    switch (mimetype) {
        case "application/pdf":
            return matchesSignature(
                buffer,
                [
                    0x25,
                    0x50,
                    0x44,
                    0x46
                ]
            );

        case "image/png":
            return matchesSignature(
                buffer,
                [
                    0x89,
                    0x50,
                    0x4e,
                    0x47,
                    0x0d,
                    0x0a,
                    0x1a,
                    0x0a
                ]
            );

        case "image/jpeg":
        case "image/jpg":
            return matchesSignature(
                buffer,
                [
                    0xff,
                    0xd8,
                    0xff
                ]
            );

        case "image/webp":
            return (
                matchesSignature(
                    buffer,
                    [
                        0x52,
                        0x49,
                        0x46,
                        0x46
                    ]
                ) &&
                matchesSignature(
                    buffer,
                    [
                        0x57,
                        0x45,
                        0x42,
                        0x50
                    ],
                    8
                )
            );

        case "image/gif":
            return (
                matchesSignature(
                    buffer,
                    [
                        0x47,
                        0x49,
                        0x46,
                        0x38,
                        0x37,
                        0x61
                    ]
                ) ||
                matchesSignature(
                    buffer,
                    [
                        0x47,
                        0x49,
                        0x46,
                        0x38,
                        0x39,
                        0x61
                    ]
                )
            );

        case "audio/mpeg":
        case "audio/mp3":
            return (
                matchesSignature(
                    buffer,
                    [
                        0x49,
                        0x44,
                        0x33
                    ]
                ) ||
                matchesSignature(
                    buffer,
                    [0xff, 0xfb]
                ) ||
                matchesSignature(
                    buffer,
                    [0xff, 0xf3]
                ) ||
                matchesSignature(
                    buffer,
                    [0xff, 0xf2]
                )
            );

        case "audio/wav":
        case "audio/x-wav":
            return (
                matchesSignature(
                    buffer,
                    [
                        0x52,
                        0x49,
                        0x46,
                        0x46
                    ]
                ) &&
                matchesSignature(
                    buffer,
                    [
                        0x57,
                        0x41,
                        0x56,
                        0x45
                    ],
                    8
                )
            );

        case "audio/mp4":
        case "audio/x-m4a":
        case "video/mp4":
        case "video/quicktime":
            return matchesSignature(
                buffer,
                [
                    0x66,
                    0x74,
                    0x79,
                    0x70
                ],
                4
            );

        case "video/webm":
            return matchesSignature(
                buffer,
                [
                    0x1a,
                    0x45,
                    0xdf,
                    0xa3
                ]
            );

        default:
            return false;
    }
}

async function verifyUploadedFileSignature(
    req,
    res,
    next
) {
    if (!req.file) {
        return next();
    }

    try {
        const headerBuffer =
            req.file.buffer.subarray(0, 16);

        const valid =
            fileSignatureMatchesMimeType(
                headerBuffer,
                req.file.mimetype
            );

        if (!valid) {
            return res.status(400).json({
                success: false,
                message:
                    "This file's contents do not match its file type and was rejected."
            });
        }

        next();
    } catch (error) {
        console.error(
            "FILE SIGNATURE CHECK ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to validate uploaded file."
        });
    }
}

/* =========================================================
   DOCUMENT SECURITY PASSWORD
========================================================= */

async function documentPasswordMiddleware(
    req,
    res,
    next
) {
    try {
        const password =
            req.headers[
                "x-document-password"
            ];

        if (
            typeof password !== "string" ||
            password.length === 0
        ) {
            return res.status(401).json({
                success: false,
                message:
                    "Document Security Password is required."
            });
        }

        const [rows] =
            await db.query(
                `
                SELECT password_hash
                FROM document_security
                WHERE user_id = ?
                LIMIT 1
                `,
                [req.user.id]
            );

        if (
            !rows ||
            rows.length === 0
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "Document Security Password has not been configured."
            });
        }

        const passwordMatches =
            await bcrypt.compare(
                password,
                rows[0].password_hash
            );

        if (!passwordMatches) {
            return res.status(403).json({
                success: false,
                message:
                    "Invalid Document Security Password."
            });
        }

        next();
    } catch (error) {
        console.error(
            "DOCUMENT PASSWORD VERIFICATION ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message:
                "Unable to verify Document Security Password."
        });
    }
}

/* =========================================================
   LOCAL FILE PATH
========================================================= */

function getPhysicalFilePath(
    filePath
) {
    if (
        !filePath ||
        typeof filePath !== "string"
    ) {
        return null;
    }

    const fileName =
        path.basename(filePath);

    if (
        !fileName ||
        fileName === "." ||
        fileName === ".."
    ) {
        return null;
    }

    return path.join(
        UPLOAD_DIR,
        fileName
    );
}

/* =========================================================
   SUPABASE REFERENCE NORMALIZATION

   Supports:

   1. supabase://documents/...
   2. documents/...
   3. https://PROJECT.supabase.co/storage/v1/object/...
========================================================= */

function normalizeSupabaseReference(
    filePath
) {
    if (
        !filePath ||
        typeof filePath !== "string"
    ) {
        return null;
    }

    const value =
        filePath.trim();

    if (
        isSupabaseStorageReference(
            value
        )
    ) {
        return value;
    }

    /*
     * Raw Supabase object path.
     */
    if (
        value.startsWith(
            "documents/"
        ) &&
        !value.includes("..")
    ) {
        return toStorageReference(
            value
        );
    }

    /*
     * Full Supabase Storage URL.
     */
    if (
        value.startsWith(
            "http://"
        ) ||
        value.startsWith(
            "https://"
        )
    ) {
        try {
            const url =
                new URL(value);

            const marker =
                "/storage/v1/object/";

            const index =
                url.pathname.indexOf(
                    marker
                );

            if (index < 0) {
                return null;
            }

            const remainder =
                url.pathname.slice(
                    index +
                        marker.length
                );

            const parts =
                remainder
                    .split("/")
                    .filter(Boolean);

            if (parts.length < 2) {
                return null;
            }

            const bucket =
                decodeURIComponent(
                    parts[0]
                );

            const configuredBucket =
                process.env
                    .SUPABASE_STORAGE_BUCKET ||
                "nyaya-documents";

            if (
                bucket !==
                configuredBucket
            ) {
                return null;
            }

            const objectPath =
                parts
                    .slice(1)
                    .map((part) =>
                        decodeURIComponent(
                            part
                        )
                    )
                    .join("/");

            if (
                !objectPath ||
                objectPath.includes(
                    ".."
                )
            ) {
                return null;
            }

            return toStorageReference(
                objectPath
            );
        } catch {
            return null;
        }
    }

    return null;
}

/* =========================================================
   LOAD DOCUMENT BUFFER

   THIS IS THE MAIN FIX FOR OPEN/DOWNLOAD.

   Supabase is always tried first when the database points
   to a Supabase object.

   Legacy local files are still supported.
========================================================= */

async function loadDocumentBuffer(
    filePath,
    documentId = null
) {
    if (
        !filePath ||
        typeof filePath !== "string"
    ) {
        const error =
            new Error(
                "Document file path is missing."
            );

        error.code =
            "DOCUMENT_FILE_PATH_MISSING";

        throw error;
    }

    const normalizedReference =
        normalizeSupabaseReference(
            filePath
        );

    /*
     * SUPABASE
     */
    if (
        normalizedReference
    ) {
        console.log(
            "DOCUMENT STORAGE: Loading from Supabase:",
            normalizedReference
        );

        try {
            const buffer =
                await downloadDocumentBuffer(
                    normalizedReference
                );

            if (
                !Buffer.isBuffer(
                    buffer
                ) ||
                buffer.length === 0
            ) {
                throw new Error(
                    "Supabase returned an empty document."
                );
            }

            return buffer;
        } catch (error) {
            console.error(
                "SUPABASE DOCUMENT READ ERROR:",
                {
                    documentId,
                    reference:
                        normalizedReference,
                    message:
                        error.message
                }
            );

            throw error;
        }
    }

    /*
     * LEGACY LOCAL FILE
     */
    const physicalPath =
        getPhysicalFilePath(
            filePath
        );

    if (
        !physicalPath ||
        !fs.existsSync(
            physicalPath
        )
    ) {
        const error =
            new Error(
                "Document file is no longer available."
            );

        error.code =
            "DOCUMENT_FILE_NOT_FOUND";

        throw error;
    }

    console.log(
        "DOCUMENT STORAGE: Loading legacy local file:",
        physicalPath
    );

    const buffer =
        await fs.promises.readFile(
            physicalPath
        );

    if (
        !Buffer.isBuffer(
            buffer
        ) ||
        buffer.length === 0
    ) {
        const error =
            new Error(
                "Document file is empty."
            );

        error.code =
            "DOCUMENT_FILE_EMPTY";

        throw error;
    }

    return buffer;
}

/* =========================================================
   DELETE STORAGE OBJECT
========================================================= */

async function deleteStoredDocument(
    filePath
) {
    if (
        !filePath ||
        typeof filePath !== "string"
    ) {
        return;
    }

    const normalizedReference =
        normalizeSupabaseReference(
            filePath
        );

    if (
        normalizedReference
    ) {
        await deleteDocumentFromStorage(
            normalizedReference
        );

        return;
    }

    const physicalPath =
        getPhysicalFilePath(
            filePath
        );

    if (
        physicalPath &&
        fs.existsSync(
            physicalPath
        )
    ) {
        await fs.promises.unlink(
            physicalPath
        );
    }
}

/* =========================================================
   BLOCKCHAIN REGISTRATION
========================================================= */

async function registerDocumentOnBlockchain(
    documentId,
    documentHash
) {
    if (
        !isBlockchainEnabled()
    ) {
        return {
            attempted: false,
            status: null,
            txHash: null
        };
    }

    try {
        const anchorResult =
            await anchorHashOnChain(
                documentHash
            );

        await setBlockchainRegistration(
            documentId,
            {
                status: "registered",
                txHash:
                    anchorResult.txHash
            }
        );

        return {
            attempted: true,
            status: "registered",
            txHash:
                anchorResult.txHash
        };
    } catch (
        blockchainError
    ) {
        console.error(
            "BLOCKCHAIN REGISTRATION ERROR:",
            blockchainError.message
        );

        try {
            await setBlockchainRegistration(
                documentId,
                {
                    status: "failed",
                    txHash: null
                }
            );
        } catch (
            dbError
        ) {
            console.error(
                "BLOCKCHAIN STATUS UPDATE ERROR:",
                dbError.message
            );
        }

        return {
            attempted: true,
            status: "failed",
            txHash: null
        };
    }
}

/* =========================================================
   DOCUMENT COUNT
========================================================= */

router.get(
    "/documents/count",
    authMiddleware,
    async (req, res) => {
        try {
            const [rows] =
                await db.query(
                    `
                    SELECT COUNT(*) AS count
                    FROM documents
                    WHERE user_id = ?
                    `,
                    [req.user.id]
                );

            return res.json({
                success: true,
                count: Number(
                    rows[0]?.count || 0
                )
            });
        } catch (error) {
            console.error(
                "DOCUMENT COUNT ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Unable to load document count."
            });
        }
    }
);

/* =========================================================
   GET USER DOCUMENTS
========================================================= */

router.get(
    "/documents",
    authMiddleware,
    documentPasswordMiddleware,
    async (req, res) => {
        try {
            const [documents] =
                await db.query(
                    `
                    SELECT
                        id,
                        user_id,
                        file_name,
                        file_path,
                        file_type,
                        uploaded_at,
                        document_hash,
                        blockchain_tx_hash,
                        blockchain_status
                    FROM documents
                    WHERE user_id = ?
                    ORDER BY uploaded_at DESC
                    `,
                    [req.user.id]
                );

            const safeDocuments =
                documents.map(
                    (document) => ({
                        id:
                            document.id,

                        user_id:
                            document.user_id,

                        file_name:
                            document.file_name,

                        file_type:
                            document.file_type,

                        uploaded_at:
                            document.uploaded_at,

                        document_hash:
                            document.document_hash ||
                            null,

                        blockchain_tx_hash:
                            document.blockchain_tx_hash ||
                            null,

                        blockchain_status:
                            document.blockchain_status ||
                            null,

                        blockchain_network:
                            document.blockchain_tx_hash
                                ? getNetworkName() ||
                                  null
                                : null
                    })
                );

            return res.json({
                success: true,
                documents:
                    safeDocuments
            });
        } catch (error) {
            console.error(
                "GET DOCUMENTS ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to load documents."
            });
        }
    }
);

/* =========================================================
   UPLOAD DOCUMENT
========================================================= */

router.post(
    "/upload",
    authMiddleware,
    documentPasswordMiddleware,
    upload.single("document"),
    verifyUploadedFileSignature,
    async (req, res) => {
        let storageObjectPath =
            null;

        let externalFileUploaded =
            false;

        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message:
                        "No file was uploaded."
                });
            }

            const fileName =
                req.file.originalname;

            const fileType =
                req.file.mimetype;

            const fileBuffer =
                req.file.buffer;

            const documentHash =
                hashDocument(
                    fileBuffer
                );

            /*
             * NEW DOCUMENTS ALWAYS GO TO SUPABASE.
             */

            storageObjectPath =
                createDocumentStoragePath(
                    req.user.id,
                    fileName
                );

            const filePath =
                toStorageReference(
                    storageObjectPath
                );

            await uploadDocumentBuffer(
                fileBuffer,
                storageObjectPath,
                fileType
            );

            externalFileUploaded =
                true;

            const [result] =
                await db.query(
                    `
                    INSERT INTO documents
                    (
                        user_id,
                        file_name,
                        file_path,
                        file_type,
                        document_hash
                    )
                    VALUES
                    (?, ?, ?, ?, ?)
                    `,
                    [
                        req.user.id,
                        fileName,
                        filePath,
                        fileType,
                        documentHash
                    ]
                );

            const documentId =
                result.insertId;

            const blockchainResult =
                await registerDocumentOnBlockchain(
                    documentId,
                    documentHash
                );

            await logDocumentActivity({
                documentId,
                userId:
                    req.user.id,
                action:
                    "document_uploaded",
                req,
                metadata: {
                    fileName,
                    fileType
                }
            });

            return res.status(201).json({
                success: true,
                message:
                    "Document uploaded successfully.",
                file: {
                    id:
                        documentId,
                    name:
                        fileName,
                    type:
                        fileType
                },
                blockchain: {
                    status:
                        blockchainResult.status
                }
            });
        } catch (error) {
            console.error(
                "UPLOAD DOCUMENT ERROR:",
                error
            );

            if (
                externalFileUploaded &&
                storageObjectPath
            ) {
                try {
                    await deleteDocumentFromStorage(
                        toStorageReference(
                            storageObjectPath
                        )
                    );
                } catch (
                    cleanupError
                ) {
                    console.error(
                        "SUPABASE UPLOAD CLEANUP ERROR:",
                        cleanupError.message
                    );
                }
            }

            return res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "File upload failed."
            });
        }
    }
);

/* =========================================================
   BLOCKCHAIN REGISTER
========================================================= */

router.post(
    "/documents/:id/blockchain/register",
    authMiddleware,
    documentPasswordMiddleware,
    async (req, res) => {
        try {
            const documentId =
                Number(
                    req.params.id
                );

            if (
                !Number.isInteger(
                    documentId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid document ID."
                });
            }

            const document =
                await getDocumentForBlockchain(
                    documentId,
                    req.user.id
                );

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Document not found."
                });
            }

            if (
                !document.document_hash
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Document has no stored hash to register."
                });
            }

            if (
                document.blockchain_status ===
                "registered"
            ) {
                return res.status(200).json({
                    success: true,
                    message:
                        "Document is already registered on-chain.",
                    blockchain: {
                        status:
                            document.blockchain_status
                    }
                });
            }

            if (
                !isBlockchainEnabled()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Blockchain integration is currently disabled."
                });
            }

            const blockchainResult =
                await registerDocumentOnBlockchain(
                    documentId,
                    document.document_hash
                );

            if (
                blockchainResult.status !==
                "registered"
            ) {
                return res.status(502).json({
                    success: false,
                    message:
                        "Blockchain registration failed. Please try again later.",
                    blockchain: {
                        status:
                            blockchainResult.status
                    }
                });
            }

            return res.json({
                success: true,
                message:
                    "Document registered on blockchain.",
                blockchain: {
                    status:
                        blockchainResult.status,
                    txHash:
                        blockchainResult.txHash
                }
            });
        } catch (error) {
            console.error(
                "BLOCKCHAIN REGISTER ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to register document on blockchain."
            });
        }
    }
);

/* =========================================================
   BLOCKCHAIN VERIFY
========================================================= */

router.post(
    "/documents/:id/blockchain/verify",
    authMiddleware,
    documentPasswordMiddleware,
    async (req, res) => {
        try {
            const documentId =
                Number(
                    req.params.id
                );

            if (
                !Number.isInteger(
                    documentId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid document ID."
                });
            }

            const document =
                await getDocumentForBlockchain(
                    documentId,
                    req.user.id
                );

            if (!document) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Document not found."
                });
            }

            if (
                document.blockchain_status !==
                    "registered" ||
                !document.blockchain_tx_hash
            ) {
                await logDocumentActivity({
                    documentId,
                    userId:
                        req.user.id,
                    action:
                        "blockchain_verified",
                    req,
                    metadata: {
                        status:
                            "not_registered"
                    }
                });

                return res.status(200).json({
                    success: true,
                    status:
                        "not_registered"
                });
            }

            let fileBuffer;

            try {
                fileBuffer =
                    await loadDocumentBuffer(
                        document.file_path,
                        documentId
                    );
            } catch (
                storageError
            ) {
                console.error(
                    "BLOCKCHAIN VERIFY FILE READ ERROR:",
                    storageError.message
                );

                return res.status(404).json({
                    success: false,
                    message:
                        "Document file is no longer available."
                });
            }

            const currentHash =
                hashDocument(
                    fileBuffer
                );

            let onChainResult;

            try {
                onChainResult =
                    await verifyHashOnChain(
                        document.blockchain_tx_hash
                    );
            } catch (
                blockchainError
            ) {
                console.error(
                    "BLOCKCHAIN VERIFY ON-CHAIN ERROR:",
                    blockchainError.message
                );

                await logDocumentActivity({
                    documentId,
                    userId:
                        req.user.id,
                    action:
                        "blockchain_verified",
                    req,
                    metadata: {
                        status:
                            "blockchain_unavailable"
                    }
                });

                return res.status(200).json({
                    success: true,
                    status:
                        "blockchain_unavailable"
                });
            }

            if (
                !onChainResult ||
                !onChainResult.found ||
                !onChainResult.documentHash
            ) {
                return res.status(200).json({
                    success: true,
                    status:
                        "blockchain_unavailable"
                });
            }

            const onChainHash =
                String(
                    onChainResult.documentHash
                ).toLowerCase();

            const matches =
                currentHash.toLowerCase() ===
                onChainHash;

            await logDocumentActivity({
                documentId,
                userId:
                    req.user.id,
                action:
                    "blockchain_verified",
                req,
                metadata: {
                    status:
                        matches
                            ? "verified"
                            : "tampered"
                }
            });

            if (matches) {
                return res.status(200).json({
                    success: true,
                    status:
                        "verified",
                    verified:
                        true
                });
            }

            return res.status(200).json({
                success: true,
                status:
                    "tampered",
                verified:
                    false
            });
        } catch (error) {
            console.error(
                "BLOCKCHAIN VERIFY ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to verify document on blockchain."
            });
        }
    }
);

/* =========================================================
   OPEN / VIEW DOCUMENT

   GET /api/documents/:id/content
========================================================= */

router.get(
    "/documents/:id/content",
    authMiddleware,
    documentPasswordMiddleware,
    async (req, res) => {
        try {
            const documentId =
                Number(
                    req.params.id
                );

            if (
                !Number.isInteger(
                    documentId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid document ID."
                });
            }

            const [rows] =
                await db.query(
                    `
                    SELECT
                        id,
                        file_name,
                        file_path,
                        file_type
                    FROM documents
                    WHERE id = ?
                      AND user_id = ?
                    LIMIT 1
                    `,
                    [
                        documentId,
                        req.user.id
                    ]
                );

            if (
                !rows ||
                rows.length === 0
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Document not found."
                });
            }

            const document =
                rows[0];

            console.log(
                "OPEN DOCUMENT REQUEST:",
                {
                    documentId,
                    fileName:
                        document.file_name,
                    filePath:
                        document.file_path,
                    fileType:
                        document.file_type
                }
            );

            let fileBuffer;

            try {
                fileBuffer =
                    await loadDocumentBuffer(
                        document.file_path,
                        documentId
                    );
            } catch (
                storageError
            ) {
                console.error(
                    "VIEW DOCUMENT STORAGE ERROR:",
                    {
                        documentId,
                        filePath:
                            document.file_path,
                        error:
                            storageError.message,
                        code:
                            storageError.code
                    }
                );

                return res.status(404).json({
                    success: false,
                    message:
                        "Document file is no longer available."
                });
            }

            res.setHeader(
                "Content-Type",
                document.file_type ||
                    "application/octet-stream"
            );

            /*
             * Inline is important for browser viewing.
             */
            res.setHeader(
                "Content-Disposition",
                `inline; filename="${encodeURIComponent(
                    document.file_name
                )}"`
            );

            res.setHeader(
                "Content-Length",
                String(
                    fileBuffer.length
                )
            );

            await logDocumentActivity({
                documentId,
                userId:
                    req.user.id,
                action:
                    "document_viewed",
                req,
                metadata: {
                    fileName:
                        document.file_name
                }
            });

            return res.send(
                fileBuffer
            );
        } catch (error) {
            console.error(
                "VIEW DOCUMENT ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to open document."
            });
        }
    }
);

/* =========================================================
   DOWNLOAD DOCUMENT
========================================================= */

router.get(
    "/documents/:id/download",
    authMiddleware,
    documentPasswordMiddleware,
    async (req, res) => {
        try {
            const documentId =
                Number(
                    req.params.id
                );

            if (
                !Number.isInteger(
                    documentId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid document ID."
                });
            }

            const [rows] =
                await db.query(
                    `
                    SELECT
                        id,
                        file_name,
                        file_path,
                        file_type
                    FROM documents
                    WHERE id = ?
                      AND user_id = ?
                    LIMIT 1
                    `,
                    [
                        documentId,
                        req.user.id
                    ]
                );

            if (
                !rows ||
                rows.length === 0
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Document not found."
                });
            }

            const document =
                rows[0];

            let fileBuffer;

            try {
                fileBuffer =
                    await loadDocumentBuffer(
                        document.file_path,
                        documentId
                    );
            } catch (
                storageError
            ) {
                console.error(
                    "DOWNLOAD DOCUMENT STORAGE ERROR:",
                    storageError
                );

                return res.status(404).json({
                    success: false,
                    message:
                        "Document file is no longer available."
                });
            }

            await logDocumentActivity({
                documentId,
                userId:
                    req.user.id,
                action:
                    "document_downloaded",
                req,
                metadata: {
                    fileName:
                        document.file_name
                }
            });

            res.setHeader(
                "Content-Type",
                document.file_type ||
                    "application/octet-stream"
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${encodeURIComponent(
                    document.file_name
                )}"`
            );

            res.setHeader(
                "Content-Length",
                String(
                    fileBuffer.length
                )
            );

            return res.send(
                fileBuffer
            );
        } catch (error) {
            console.error(
                "DOWNLOAD DOCUMENT ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to download document."
            });
        }
    }
);

/* =========================================================
   DELETE DOCUMENT
========================================================= */

router.delete(
    "/documents/:id",
    authMiddleware,
    documentPasswordMiddleware,
    async (req, res) => {
        try {
            const documentId =
                Number(
                    req.params.id
                );

            if (
                !Number.isInteger(
                    documentId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid document ID."
                });
            }

            const [rows] =
                await db.query(
                    `
                    SELECT
                        id,
                        file_name,
                        file_path
                    FROM documents
                    WHERE id = ?
                      AND user_id = ?
                    LIMIT 1
                    `,
                    [
                        documentId,
                        req.user.id
                    ]
                );

            if (
                !rows ||
                rows.length === 0
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Document not found."
                });
            }

            const document =
                rows[0];

            /*
             * Remove database record first.
             */
            await db.query(
                `
                DELETE FROM documents
                WHERE id = ?
                  AND user_id = ?
                `,
                [
                    documentId,
                    req.user.id
                ]
            );

            /*
             * Then remove physical/Supabase file.
             */
            try {
                await deleteStoredDocument(
                    document.file_path
                );
            } catch (
                storageError
            ) {
                console.error(
                    "DELETE DOCUMENT STORAGE ERROR:",
                    storageError.message
                );
            }

            await logDocumentActivity({
                documentId,
                userId:
                    req.user.id,
                action:
                    "document_deleted",
                req,
                metadata: {
                    fileName:
                        document.file_name
                }
            });

            return res.json({
                success: true,
                message:
                    "Document deleted successfully."
            });
        } catch (error) {
            console.error(
                "DELETE DOCUMENT ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to delete document."
            });
        }
    }
);

/* =========================================================
   RENAME DOCUMENT
========================================================= */

router.put(
    "/documents/:id",
    authMiddleware,
    documentPasswordMiddleware,
    async (req, res) => {
        try {
            const documentId =
                Number(
                    req.params.id
                );

            const newName =
                typeof req.body
                    ?.file_name ===
                "string"
                    ? req.body.file_name.trim()
                    : "";

            if (
                !Number.isInteger(
                    documentId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid document ID."
                });
            }

            if (!newName) {
                return res.status(400).json({
                    success: false,
                    message:
                        "A document name is required."
                });
            }

            if (
                newName.length > 255
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Document name must not exceed 255 characters."
                });
            }

            const cleanedName =
                path.basename(
                    newName
                );

            if (
                !cleanedName ||
                cleanedName === "." ||
                cleanedName === ".."
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid document name."
                });
            }

            const [result] =
                await db.query(
                    `
                    UPDATE documents
                    SET file_name = ?
                    WHERE id = ?
                      AND user_id = ?
                    `,
                    [
                        cleanedName,
                        documentId,
                        req.user.id
                    ]
                );

            if (
                result.affectedRows === 0
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Document not found."
                });
            }

            await logDocumentActivity({
                documentId,
                userId:
                    req.user.id,
                action:
                    "document_renamed",
                req,
                metadata: {
                    fileName:
                        cleanedName
                }
            });

            return res.json({
                success: true,
                message:
                    "Document renamed successfully.",
                file_name:
                    cleanedName
            });
        } catch (error) {
            console.error(
                "RENAME DOCUMENT ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to rename document."
            });
        }
    }
);

/* =========================================================
   DOCUMENT AUDIT HISTORY
========================================================= */

router.get(
    "/documents/:id/audit",
    authMiddleware,
    async (req, res) => {
        try {
            const documentId =
                Number(
                    req.params.id
                );

            if (
                !Number.isInteger(
                    documentId
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid document ID."
                });
            }

            const [documentRows] =
                await db.query(
                    `
                    SELECT id
                    FROM documents
                    WHERE id = ?
                      AND user_id = ?
                    LIMIT 1
                    `,
                    [
                        documentId,
                        req.user.id
                    ]
                );

            if (
                !documentRows ||
                documentRows.length === 0
            ) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Document not found."
                });
            }

            const [auditRows] =
                await db.query(
                    `
                    SELECT
                        id,
                        description,
                        created_at,
                        ip_address,
                        user_agent,
                        metadata
                    FROM audit_logs
                    WHERE entity_type = 'document'
                      AND entity_id = ?
                    ORDER BY created_at DESC
                    `,
                    [documentId]
                );

            const history =
                (
                    auditRows || []
                ).map(
                    (row) => {
                        let parsedMetadata =
                            null;

                        if (
                            row.metadata !==
                                null &&
                            row.metadata !==
                                undefined
                        ) {
                            if (
                                typeof row.metadata ===
                                "string"
                            ) {
                                try {
                                    parsedMetadata =
                                        JSON.parse(
                                            row.metadata
                                        );
                                } catch {
                                    parsedMetadata =
                                        null;
                                }
                            } else {
                                parsedMetadata =
                                    row.metadata;
                            }
                        }

                        return {
                            id:
                                row.id,

                            description:
                                row.description,

                            created_at:
                                row.created_at,

                            ip_address:
                                row.ip_address,

                            user_agent:
                                row.user_agent,

                            metadata:
                                parsedMetadata
                        };
                    }
                );

            return res.json({
                success: true,
                documentId,
                count:
                    history.length,
                history
            });
        } catch (error) {
            console.error(
                "GET DOCUMENT AUDIT HISTORY ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    "Failed to retrieve document audit history."
            });
        }
    }
);

/* =========================================================
   MULTER / ROUTE ERROR HANDLER
========================================================= */

router.use(
    (
        error,
        req,
        res,
        next
    ) => {
        console.error(
            "DOCUMENT ROUTE ERROR:",
            error
        );

        if (
            error instanceof
            multer.MulterError
        ) {
            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {
                return res.status(413).json({
                    success: false,
                    message:
                        "File is too large. Maximum allowed size is 10 MB per file."
                });
            }

            if (
                error.code ===
                "LIMIT_FILE_COUNT"
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "Only one file can be uploaded at a time."
                });
            }

            return res.status(400).json({
                success: false,
                message:
                    error.message ||
                    "File upload error."
            });
        }

        if (error) {
            return res.status(400).json({
                success: false,
                message:
                    error.message ||
                    "File upload failed."
            });
        }

        next();
    }
);

/* =========================================================
   EXPORT
========================================================= */

module.exports = router;