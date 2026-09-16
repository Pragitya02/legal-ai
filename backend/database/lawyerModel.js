const db = require("../db");

async function getAllLawyers() {
    const [rows] = await db.query("SELECT * FROM lawyers");
    return rows;
}

module.exports = {
    getAllLawyers
};