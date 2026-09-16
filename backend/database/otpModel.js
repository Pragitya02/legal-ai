const db = require("../db");

// =====================================================
// ENSURE TABLE EXISTS
// (safe to call multiple times, runs once at startup)
// =====================================================

async function ensureOtpTable() {

    // Fresh installs get the secure schema directly — the OTP
    // is stored as an HMAC hash, never in plaintext.
    const sql = `
        CREATE TABLE IF NOT EXISTS otp_verifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            otp_hash VARCHAR(255) NOT NULL,
            purpose VARCHAR(30) NOT NULL DEFAULT 'signup',
            verified TINYINT(1) NOT NULL DEFAULT 0,
            attempts INT NOT NULL DEFAULT 0,
            expires_at DATETIME NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_email_purpose (email, purpose)
        )
    `;

    await db.query(sql);

    // -----------------------------------------------
    // MIGRATION: existing deployments may still have the
    // old plaintext `otp_code` column. Add `otp_hash` if it
    // is missing, then drop the plaintext column so no
    // plaintext OTP remains in the database.
    // -----------------------------------------------

    const [hashColumn] = await db.query(
        `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'otp_verifications'
          AND COLUMN_NAME = 'otp_hash'
        `
    );

    if (hashColumn.length === 0) {
        await db.query(
            `ALTER TABLE otp_verifications ADD COLUMN otp_hash VARCHAR(255) NOT NULL DEFAULT '' AFTER email`
        );

        console.log("Added otp_hash column to otp_verifications table.");
    }

    const [plaintextColumn] = await db.query(
        `
        SELECT COLUMN_NAME
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'otp_verifications'
          AND COLUMN_NAME = 'otp_code'
        `
    );

    if (plaintextColumn.length > 0) {
        // Any rows still relying on the plaintext column are, at
        // most, a few minutes old (OTPs expire quickly) — safe to
        // invalidate rather than migrate, since we cannot recover
        // the plaintext code to hash it without knowing it.
        await db.query(`DELETE FROM otp_verifications WHERE otp_hash = ''`);
        await db.query(`ALTER TABLE otp_verifications DROP COLUMN otp_code`);

        console.log("Removed plaintext otp_code column from otp_verifications table.");
    }

    console.log("OTP table ready (otp_verifications).");
}


// =====================================================
// CREATE OR REPLACE OTP FOR AN EMAIL + PURPOSE
// =====================================================

async function upsertOtp(email, otpHash, purpose, expiresAt) {

    const sql = `
        INSERT INTO otp_verifications
            (email, otp_hash, purpose, verified, attempts, expires_at)
        VALUES (?, ?, ?, 0, 0, ?)
        ON DUPLICATE KEY UPDATE
            otp_hash = VALUES(otp_hash),
            verified = 0,
            attempts = 0,
            expires_at = VALUES(expires_at)
    `;

    const [result] = await db.query(
        sql,
        [email, otpHash, purpose, expiresAt]
    );

    return result;
}


// =====================================================
// FIND OTP ROW
// =====================================================

async function findOtp(email, purpose) {

    const sql = `
        SELECT *
        FROM otp_verifications
        WHERE email = ? AND purpose = ?
        LIMIT 1
    `;

    const [rows] = await db.query(sql, [email, purpose]);

    return rows[0];
}


// =====================================================
// MARK OTP AS VERIFIED
// =====================================================

async function markOtpVerified(email, purpose) {

    const sql = `
        UPDATE otp_verifications
        SET verified = 1
        WHERE email = ? AND purpose = ?
    `;

    const [result] = await db.query(sql, [email, purpose]);

    return result;
}


// =====================================================
// INCREMENT FAILED ATTEMPTS
// =====================================================

async function incrementOtpAttempts(email, purpose) {

    const sql = `
        UPDATE otp_verifications
        SET attempts = attempts + 1
        WHERE email = ? AND purpose = ?
    `;

    const [result] = await db.query(sql, [email, purpose]);

    return result;
}


// =====================================================
// DELETE OTP (after successful signup, or cleanup)
// =====================================================

async function deleteOtp(email, purpose) {

    const sql = `
        DELETE FROM otp_verifications
        WHERE email = ? AND purpose = ?
    `;

    const [result] = await db.query(sql, [email, purpose]);

    return result;
}


module.exports = {
    ensureOtpTable,
    upsertOtp,
    findOtp,
    markOtpVerified,
    incrementOtpAttempts,
    deleteOtp
};
