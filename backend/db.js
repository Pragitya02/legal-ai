const mysql = require("mysql2/promise");

console.log("DATABASE CONNECTION:");

console.log("HOST:", process.env.DB_HOST);
console.log("PORT:", process.env.DB_PORT);
console.log("USER:", process.env.DB_USER);
console.log("DATABASE:", process.env.DB_NAME);

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: 10
});

// =====================================================
// CREATE NOTIFICATIONS TABLE
// =====================================================

async function initializeNotificationsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INT NOT NULL AUTO_INCREMENT,
                user_id INT NOT NULL,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                related_id INT DEFAULT NULL,
                is_read TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                PRIMARY KEY (id),

                INDEX idx_notifications_user (user_id),
                INDEX idx_notifications_read (user_id, is_read),
                INDEX idx_notifications_created (user_id, created_at),

                CONSTRAINT fk_notifications_user
                    FOREIGN KEY (user_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE
            )
        `);

        console.log("NOTIFICATIONS TABLE READY");

    } catch (error) {

        console.error(
            "FAILED TO CREATE NOTIFICATIONS TABLE:",
            error.message
        );

    }
}


// =====================================================
// CREATE APPOINTMENTS TABLE
// =====================================================

async function initializeAppointmentsTable() {

    try {

        await pool.query(`
            CREATE TABLE IF NOT EXISTS appointments (

                id INT NOT NULL AUTO_INCREMENT,

                citizen_id INT NOT NULL,

                advocate_id INT NOT NULL,

                appointment_date DATE NOT NULL,

                appointment_time VARCHAR(50) NOT NULL,

                mode VARCHAR(20) NOT NULL DEFAULT 'video',

                consultation_fee DECIMAL(10,2) NOT NULL DEFAULT 0,

                platform_fee DECIMAL(10,2) NOT NULL DEFAULT 0,

                total_fee DECIMAL(10,2) NOT NULL DEFAULT 0,

                status VARCHAR(30) NOT NULL DEFAULT 'pending',

                payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',

                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                PRIMARY KEY (id),

                INDEX idx_appointments_citizen (citizen_id),

                INDEX idx_appointments_advocate (advocate_id),

                INDEX idx_appointments_date (
                    appointment_date,
                    appointment_time
                ),

                INDEX idx_appointments_status (
                    status
                ),

                CONSTRAINT fk_appointments_citizen
                    FOREIGN KEY (citizen_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE,

                CONSTRAINT fk_appointments_advocate
                    FOREIGN KEY (advocate_id)
                    REFERENCES users(id)
                    ON DELETE CASCADE

            )
        `);

        console.log("APPOINTMENTS TABLE READY");

    } catch (error) {

        console.error(
            "FAILED TO CREATE APPOINTMENTS TABLE:",
            error.message
        );

    }
}


// =====================================================
// CREATE CONSULTATION MEETINGS TABLE
// =====================================================

async function initializeConsultationMeetingsTable() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS consultation_meetings (
                id INT NOT NULL AUTO_INCREMENT,
                appointment_id INT NOT NULL,
                room_name VARCHAR(255) NOT NULL,
                scheduled_start DATETIME NOT NULL,
                scheduled_end DATETIME NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

                PRIMARY KEY (id),

                UNIQUE KEY uq_consultation_meetings_appointment (appointment_id),
                INDEX idx_consultation_meetings_start (scheduled_start),

                CONSTRAINT fk_consultation_meetings_appointment
                    FOREIGN KEY (appointment_id)
                    REFERENCES appointments(id)
                    ON DELETE CASCADE
            )
        `);

        console.log("CONSULTATION MEETINGS TABLE READY");
    } catch (error) {
        console.error(
            "FAILED TO CREATE CONSULTATION MEETINGS TABLE:",
            error.message
        );
    }
}


// =====================================================
// INITIALIZE DATABASE TABLES
// =====================================================

async function initializeDatabaseTables() {
    await initializeNotificationsTable();
    await initializeAppointmentsTable();
    await initializeConsultationMeetingsTable();
}

initializeDatabaseTables();


// =====================================================
// EXPORT DATABASE
// =====================================================

module.exports = pool;