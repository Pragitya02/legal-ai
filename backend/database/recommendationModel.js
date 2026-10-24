const db = require("../db");

async function getLatestSpecialization() {

    const [rows] = await db.query(`
        SELECT category
        FROM cases
        ORDER BY id DESC
        LIMIT 1
    `);

    if (rows.length === 0) {
        return null;
    }

    return rows[0].category;
}

module.exports = {
    getLatestSpecialization
};