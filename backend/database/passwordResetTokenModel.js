const db = require("../db");

// =====================================================
// ENSURE TABLE EXISTS
// =====================================================

async function ensurePasswordResetTokenTable() {

    const sql = `
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token_hash VARCHAR(255) NOT NULL,
            expires_at DATETIME NOT NULL,
            used TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_reset_token_hash (token_hash),
            INDEX idx_reset_user (user_id),
            CONSTRAINT fk_password_reset_user
                FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        )
    `;

    await db.query(sql);

    console.log("Password reset token table ready (password_reset_tokens).");
}


// =====================================================
// CREATE A NEW RESET TOKEN (hashed)
// =====================================================

async function createResetToken(userId, tokenHash, expiresAt) {

    const sql = `
        INSERT INTO password_reset_tokens
            (user_id, token_hash, expires_at, used)
        VALUES (?, ?, ?, 0)
    `;

    const [result] = await db.query(sql, [userId, tokenHash, expiresAt]);

    return result;
}


// =====================================================
// FIND A NOT-YET-USED, NOT-EXPIRED RESET TOKEN BY HASH
// =====================================================

async function findValidResetToken(tokenHash) {

    const sql = `
        SELECT *
        FROM password_reset_tokens
        WHERE token_hash = ?
          AND used = 0
          AND expires_at > NOW()
        LIMIT 1
    `;

    const [rows] = await db.query(sql, [tokenHash]);

    return rows[0];
}


// =====================================================
// MARK A RESET TOKEN AS USED (single-use enforcement)
// =====================================================

async function markResetTokenUsed(id) {

    const sql = `
        UPDATE password_reset_tokens
        SET used = 1
        WHERE id = ?
    `;

    const [result] = await db.query(sql, [id]);

    return result;
}


// =====================================================
// INVALIDATE ALL OUTSTANDING RESET TOKENS FOR A USER
// Called after a successful reset (or before issuing a new
// one) so an older, still-valid token cannot also be used.
// =====================================================

async function invalidateUserResetTokens(userId) {

    const sql = `
        UPDATE password_reset_tokens
        SET used = 1
        WHERE user_id = ? AND used = 0
    `;

    const [result] = await db.query(sql, [userId]);

    return result;
}


module.exports = {
    ensurePasswordResetTokenTable,
    createResetToken,
    findValidResetToken,
    markResetTokenUsed,
    invalidateUserResetTokens,
};
