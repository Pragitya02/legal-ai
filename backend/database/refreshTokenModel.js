const db = require("../db");

// =====================================================
// ENSURE TABLE EXISTS
// =====================================================

async function ensureRefreshTokenTable() {

    const sql = `
        CREATE TABLE IF NOT EXISTS refresh_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            token_hash VARCHAR(255) NOT NULL,
            expires_at DATETIME NOT NULL,
            revoked TINYINT(1) NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_token_hash (token_hash),
            INDEX idx_refresh_user (user_id),
            CONSTRAINT fk_refresh_tokens_user
                FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE
        )
    `;

    await db.query(sql);

    console.log("Refresh token table ready (refresh_tokens).");
}


// =====================================================
// INSERT A NEW REFRESH TOKEN (hashed)
// =====================================================

async function insertRefreshToken(userId, tokenHash, expiresAt) {

    const sql = `
        INSERT INTO refresh_tokens
            (user_id, token_hash, expires_at, revoked)
        VALUES (?, ?, ?, 0)
    `;

    const [result] = await db.query(sql, [userId, tokenHash, expiresAt]);

    return result;
}


// =====================================================
// FIND A REFRESH TOKEN BY ITS HASH
// =====================================================

async function findRefreshTokenByHash(tokenHash) {

    const sql = `
        SELECT *
        FROM refresh_tokens
        WHERE token_hash = ?
        LIMIT 1
    `;

    const [rows] = await db.query(sql, [tokenHash]);

    return rows[0];
}


// =====================================================
// REVOKE A SINGLE REFRESH TOKEN (by hash)
// =====================================================

async function revokeRefreshTokenByHash(tokenHash) {

    const sql = `
        UPDATE refresh_tokens
        SET revoked = 1
        WHERE token_hash = ?
    `;

    const [result] = await db.query(sql, [tokenHash]);

    return result;
}


// =====================================================
// REVOKE EVERY REFRESH TOKEN FOR A USER
// Used on logout and on refresh-token reuse detection
// (a strong signal a token has been stolen).
// =====================================================

async function revokeAllTokensForUser(userId) {

    const sql = `
        UPDATE refresh_tokens
        SET revoked = 1
        WHERE user_id = ? AND revoked = 0
    `;

    const [result] = await db.query(sql, [userId]);

    return result;
}


// =====================================================
// DELETE EXPIRED / REVOKED TOKENS
// (best-effort housekeeping, safe to call opportunistically)
// =====================================================

async function deleteExpiredTokens() {

    const sql = `
        DELETE FROM refresh_tokens
        WHERE expires_at < NOW() OR revoked = 1
    `;

    const [result] = await db.query(sql);

    return result;
}


module.exports = {
    ensureRefreshTokenTable,
    insertRefreshToken,
    findRefreshTokenByHash,
    revokeRefreshTokenByHash,
    revokeAllTokensForUser,
    deleteExpiredTokens,
};
