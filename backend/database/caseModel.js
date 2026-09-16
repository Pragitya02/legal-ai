const db = require("../db");

async function saveCase(userId, title, description, category, severity) {

    const sql = `
        INSERT INTO cases
        (user_id, title, description, category, severity)
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [userId, title, description, category, severity],
        (err, result) => {

            if (err) {
                console.error("Error saving case:", err);
                return;
            }

            console.log("✅ Case saved successfully!");
        }
    );
}

module.exports = {
    saveCase
};