const db = require("../db");

// =====================================================
// ENSURE DOCUMENT HASH COLUMN
// Adds a nullable document_hash column to the existing
// `documents` table (if missing), so each uploaded legal
// document can store its SHA-256 fingerprint. This is the
// only schema change needed for Step 2 of the blockchain
// integrity foundation — no new table, no data migration.
//
// Stores the "0x"-prefixed 64-char hex digest produced by
// services/blockchainService.js's hashDocument(), hence
// VARCHAR(66).
// =====================================================

async function ensureDocumentHashColumn() {

    const [columns] = await db.query(
        `
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'documents'
              AND COLUMN_NAME = 'document_hash'
        `
    );

    if (columns.length === 0) {

        await db.query(
            `ALTER TABLE documents ADD COLUMN document_hash VARCHAR(66) NULL`
        );

        console.log("Added document_hash column to documents table.");

    }

    console.log("Document hash support ready (documents table).");
}


// =====================================================
// SET DOCUMENT HASH
// Called right after a document row is inserted, once its
// SHA-256 hash has been computed from the uploaded file.
// =====================================================

async function setDocumentHash(documentId, documentHash) {

    const sql = `
        UPDATE documents
        SET document_hash = ?
        WHERE id = ?
    `;

    const [result] = await db.query(sql, [documentHash, documentId]);

    return result;
}


// =====================================================
// ENSURE BLOCKCHAIN REGISTRATION COLUMNS (Step 3)
// Adds two nullable columns to the existing `documents` table
// (if missing) so the outcome of an on-chain hash-anchoring
// attempt can be tracked against a document:
//
//   blockchain_tx_hash   - the "0x"-prefixed transaction hash
//                          returned by the testnet once the
//                          hash-anchoring transaction is
//                          confirmed. NULL until a transaction
//                          has actually been confirmed.
//   blockchain_status    - 'registered' | 'failed' | NULL.
//                          NULL means no registration has been
//                          attempted yet (blockchain disabled,
//                          or not yet retried), which also
//                          doubles as the "pending" state for
//                          retry purposes.
//
// No new table is created; this only extends the existing
// `documents` table, matching how document_hash was added.
// =====================================================

async function ensureBlockchainColumns() {

    const [columns] = await db.query(
        `
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'documents'
              AND COLUMN_NAME IN ('blockchain_tx_hash', 'blockchain_status')
        `
    );

    const existing = new Set(columns.map((row) => row.COLUMN_NAME));

    if (!existing.has("blockchain_tx_hash")) {
        await db.query(
            `ALTER TABLE documents ADD COLUMN blockchain_tx_hash VARCHAR(66) NULL`
        );
        console.log("Added blockchain_tx_hash column to documents table.");
    }

    if (!existing.has("blockchain_status")) {
        await db.query(
            `ALTER TABLE documents ADD COLUMN blockchain_status VARCHAR(20) NULL`
        );
        console.log("Added blockchain_status column to documents table.");
    }

    console.log("Blockchain registration support ready (documents table).");
}


// =====================================================
// SET BLOCKCHAIN REGISTRATION RESULT
// Called after an on-chain anchoring attempt (success or
// failure) to record the outcome against the document row.
// txHash is null on failure.
// =====================================================

async function setBlockchainRegistration(documentId, { status, txHash }) {

    const sql = `
        UPDATE documents
        SET blockchain_tx_hash = ?,
            blockchain_status = ?
        WHERE id = ?
    `;

    const [result] = await db.query(sql, [
        txHash || null,
        status,
        documentId,
    ]);

    return result;
}


// =====================================================
// GET DOCUMENT FOR BLOCKCHAIN REGISTRATION
// Fetches only the fields needed to (re)attempt on-chain
// registration for a document owned by the requesting user.
// =====================================================

async function getDocumentForBlockchain(documentId, userId) {

    const [rows] = await db.query(
        `
        SELECT
            id,
            file_path,
            document_hash,
            blockchain_tx_hash,
            blockchain_status
        FROM documents
        WHERE id = ?
          AND user_id = ?
        LIMIT 1
        `,
        [documentId, userId]
    );

    return rows && rows.length > 0 ? rows[0] : null;
}


module.exports = {
    ensureDocumentHashColumn,
    setDocumentHash,
    ensureBlockchainColumns,
    setBlockchainRegistration,
    getDocumentForBlockchain,
};
