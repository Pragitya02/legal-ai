const db = require("../db");

// =====================================================
// ENSURE GOOGLE AUTH SUPPORT
// Adds a nullable google_id column (if missing) and makes
// password nullable, so Google-only accounts can exist
// without a locally-set password.
// =====================================================

async function ensureGoogleAuthSupport() {

    const [columns] = await db.query(
        `
            SELECT COLUMN_NAME
            FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'users'
              AND COLUMN_NAME = 'google_id'
        `
    );

    if (columns.length === 0) {

        await db.query(
            `ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL UNIQUE`
        );

        console.log("Added google_id column to users table.");

    }

    // Google-only accounts have no local password.
    await db.query(
        `ALTER TABLE users MODIFY password VARCHAR(255) NULL`
    );

    console.log("Google auth support ready (users table).");
}


// =====================================================
// CREATE USER
// =====================================================

async function createUser(
    fullName,
    email,
    password,
    phone,
    role = "citizen"
) {

    const sql = `
        INSERT INTO users
        (
            full_name,
            email,
            password,
            phone,
            role
        )
        VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await db.query(
        sql,
        [
            fullName,
            email,
            password,
            phone,
            role
        ]
    );

    return result;
}


// =====================================================
// CREATE USER VIA GOOGLE (no password)
// =====================================================

async function createGoogleUser(
    fullName,
    email,
    googleId,
    role = "citizen"
) {

    const sql = `
        INSERT INTO users
        (
            full_name,
            email,
            password,
            phone,
            role,
            google_id
        )
        VALUES (?, ?, NULL, '', ?, ?)
    `;

    const [result] = await db.query(
        sql,
        [
            fullName,
            email,
            role,
            googleId
        ]
    );

    return result;
}


// =====================================================
// LINK AN EXISTING (email/password) ACCOUNT TO A GOOGLE ID
// =====================================================

async function linkGoogleId(userId, googleId) {

    const sql = `
        UPDATE users
        SET google_id = ?
        WHERE id = ?
    `;

    const [result] = await db.query(sql, [googleId, userId]);

    return result;
}


// =====================================================
// FIND USER BY GOOGLE ID
// =====================================================

async function findUserByGoogleId(googleId) {

    const sql = `
        SELECT *
        FROM users
        WHERE google_id = ?
        LIMIT 1
    `;

    const [rows] = await db.query(sql, [googleId]);

    return rows[0];
}


// =====================================================
// FIND USER BY EMAIL
// =====================================================

async function findUserByEmail(email) {

    const sql = `
        SELECT *
        FROM users
        WHERE email = ?
        LIMIT 1
    `;

    const [rows] = await db.query(
        sql,
        [email]
    );

    // NOTE: Intentionally not logging the returned row(s) here —
    // this query selects the full users row, including the
    // bcrypt password hash, and logging it would leak sensitive
    // credential material into server logs.

    return rows[0];
}


// =====================================================
// FIND USER BY ID
// =====================================================

async function findUserById(userId) {

    const sql = `
        SELECT
            id,
            full_name,
            email,
            phone,
            role
        FROM users
        WHERE id = ?
        LIMIT 1
    `;

    const [rows] = await db.query(
        sql,
        [userId]
    );

    return rows[0];
}


// =====================================================
// UPDATE USER PROFILE
// =====================================================

// =====================================================
// UPDATE USER PASSWORD
// =====================================================

async function updateUserPassword(userId, hashedPassword) {

    const sql = `
        UPDATE users
        SET password = ?
        WHERE id = ?
    `;

    const [result] = await db.query(
        sql,
        [hashedPassword, userId]
    );

    return result;
}


async function updateUserProfile(
    userId,
    fullName,
    email,
    phone
) {

    console.log(
        "Updating user profile:",
        {
            userId,
            fullName,
            email,
            phone
        }
    );

    const sql = `
        UPDATE users
        SET
            full_name = ?,
            email = ?,
            phone = ?
        WHERE id = ?
    `;

    const [result] = await db.query(
        sql,
        [
            fullName,
            email,
            phone,
            userId
        ]
    );

    console.log(
        "PROFILE UPDATE RESULT:",
        result
    );

    return result;
}


// =====================================================
// EXPORTS
// =====================================================

module.exports = {

    ensureGoogleAuthSupport,

    createUser,

    createGoogleUser,

    linkGoogleId,

    findUserByGoogleId,

    findUserByEmail,

    findUserById,

    updateUserPassword,

    updateUserProfile

};