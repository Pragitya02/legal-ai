const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

const DAY_MIN = 1;
const DAY_MAX = 7;


// =====================================================
// VALIDATION HELPERS
// =====================================================

function isValidTime(value) {
    return (
        typeof value === "string" &&
        /^\d{2}:\d{2}(:\d{2})?$/.test(value)
    );
}

function isValidDate(value) {
    return (
        typeof value === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(value)
    );
}

function isValidMonth(value) {
    return (
        typeof value === "string" &&
        /^\d{4}-\d{2}$/.test(value)
    );
}


// =====================================================
// GET LAWYER RECORD FROM USER ID
// =====================================================

async function getLawyerForUser(userId) {
    const [rows] = await db.query(
        `
            SELECT
                l.id,
                l.user_id
            FROM lawyers l
            INNER JOIN users u
                ON u.id = l.user_id
            WHERE l.user_id = ?
              AND u.role = 'lawyer'
            LIMIT 1
        `,
        [userId]
    );

    return rows[0] || null;
}


// =====================================================
// GET PUBLIC LAWYER AVAILABILITY
// FOR CITIZEN BOOKING
//
// GET /api/availability/lawyer/:advocateUserId?month=YYYY-MM
//
// IMPORTANT:
// Booking.tsx sends users.id.
//
// This endpoint supports:
// 1. users.id
// 2. lawyers.id
//
// It prefers users.id.
// =====================================================

router.get(
    "/lawyer/:advocateUserId",
    async (req, res) => {
        try {
            const advocateUserId =
                Number(req.params.advocateUserId);


            // -------------------------------------------------
            // VALIDATE ADVOCATE ID
            // -------------------------------------------------

            if (
                !Number.isInteger(advocateUserId) ||
                advocateUserId <= 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid advocate ID."
                });
            }


            // -------------------------------------------------
            // MONTH
            // -------------------------------------------------

            const month =
                typeof req.query.month === "string" &&
                isValidMonth(req.query.month)
                    ? req.query.month
                    : new Date()
                        .toISOString()
                        .slice(0, 7);


            // -------------------------------------------------
            // RESOLVE USER ID -> LAWYER ID
            //
            // Booking page normally passes users.id.
            // We also support lawyers.id as fallback.
            // -------------------------------------------------

            const [lawyerRows] =
                await db.query(
                    `
                        SELECT
                            l.id AS lawyer_id,
                            l.user_id
                        FROM lawyers l
                        INNER JOIN users u
                            ON u.id = l.user_id
                        WHERE (
                            u.id = ?
                            OR l.id = ?
                        )
                          AND u.role = 'lawyer'
                        ORDER BY
                            CASE
                                WHEN u.id = ? THEN 0
                                ELSE 1
                            END
                        LIMIT 1
                    `,
                    [
                        advocateUserId,
                        advocateUserId,
                        advocateUserId
                    ]
                );


            // -------------------------------------------------
            // ADVOCATE NOT FOUND
            // -------------------------------------------------

            if (
                lawyerRows.length === 0
            ) {
                return res.status(404).json({
                    success: false,
                    message: "Advocate not found."
                });
            }


            const lawyerId =
                lawyerRows[0].lawyer_id;


            // =================================================
            // WEEKLY AVAILABILITY
            // =================================================

            const [weeklyRows] =
                await db.query(
                    `
                        SELECT
                            id,
                            lawyer_id,
                            day_of_week,
                            TIME_FORMAT(
                                start_time,
                                '%H:%i'
                            ) AS start_time,
                            TIME_FORMAT(
                                end_time,
                                '%H:%i'
                            ) AS end_time,
                            is_available
                        FROM lawyer_availability
                        WHERE lawyer_id = ?
                        ORDER BY day_of_week ASC
                    `,
                    [lawyerId]
                );


            // =================================================
            // DATE / TIME BLOCKS
            // =================================================

            const [blockRows] =
                await db.query(
                    `
                        SELECT
                            id,
                            lawyer_id,
                            DATE_FORMAT(
                                block_date,
                                '%Y-%m-%d'
                            ) AS block_date,
                            TIME_FORMAT(
                                start_time,
                                '%H:%i'
                            ) AS start_time,
                            TIME_FORMAT(
                                end_time,
                                '%H:%i'
                            ) AS end_time,
                            block_type,
                            reason
                        FROM lawyer_time_blocks
                        WHERE lawyer_id = ?
                          AND block_date >= ?
                          AND block_date < DATE_ADD(
                              CONCAT(?, '-01'),
                              INTERVAL 1 MONTH
                          )
                        ORDER BY
                            block_date ASC,
                            start_time ASC,
                            id ASC
                    `,
                    [
                        lawyerId,
                        `${month}-01`,
                        month
                    ]
                );


            // =================================================
            // BOOKED APPOINTMENTS
            //
            // Pending + confirmed appointments occupy slots.
            // Cancelled appointments do not.
            // =================================================

            const [appointmentRows] =
                await db.query(
                    `
                        SELECT
                            DATE_FORMAT(
                                appointment_date,
                                '%Y-%m-%d %H:%i:%s'
                            ) AS appointment_date
                        FROM appointments
                        WHERE lawyer_id = ?
                          AND appointment_date >= ?
                          AND appointment_date < DATE_ADD(
                              CONCAT(?, '-01'),
                              INTERVAL 1 MONTH
                          )
                          AND status IN (
                              'pending',
                              'confirmed'
                          )
                        ORDER BY appointment_date ASC
                    `,
                    [
                        lawyerId,
                        `${month}-01`,
                        month
                    ]
                );


            // =================================================
            // RETURN DATA
            // =================================================

            return res.json({
                success: true,

                advocateUserId,

                lawyerId,

                availability:
                    weeklyRows,

                blocks:
                    blockRows,

                bookedAppointments:
                    appointmentRows,

                month
            });

        } catch (error) {

            console.error(
                "GET LAWYER AVAILABILITY ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Failed to load advocate availability."
            });
        }
    }
);


// =====================================================
// GET AVAILABILITY
// FOR LOGGED-IN ADVOCATE
//
// GET /api/availability?month=YYYY-MM
// =====================================================

router.get(
    "/",
    authMiddleware,
    async (req, res) => {
        try {

            const lawyer =
                await getLawyerForUser(
                    req.user.id
                );


            if (!lawyer) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only advocate accounts can manage availability."
                });
            }


            const month =
                typeof req.query.month === "string" &&
                isValidMonth(req.query.month)
                    ? req.query.month
                    : new Date()
                        .toISOString()
                        .slice(0, 7);


            // -------------------------------------------------
            // WEEKLY AVAILABILITY
            // -------------------------------------------------

            const [weeklyRows] =
                await db.query(
                    `
                        SELECT
                            id,
                            lawyer_id,
                            day_of_week,
                            TIME_FORMAT(
                                start_time,
                                '%H:%i'
                            ) AS start_time,
                            TIME_FORMAT(
                                end_time,
                                '%H:%i'
                            ) AS end_time,
                            is_available
                        FROM lawyer_availability
                        WHERE lawyer_id = ?
                        ORDER BY day_of_week ASC
                    `,
                    [lawyer.id]
                );


            // -------------------------------------------------
            // BLOCKS
            // -------------------------------------------------

            const [blockRows] =
                await db.query(
                    `
                        SELECT
                            id,
                            lawyer_id,
                            DATE_FORMAT(
                                block_date,
                                '%Y-%m-%d'
                            ) AS block_date,
                            TIME_FORMAT(
                                start_time,
                                '%H:%i'
                            ) AS start_time,
                            TIME_FORMAT(
                                end_time,
                                '%H:%i'
                            ) AS end_time,
                            block_type,
                            reason,
                            created_at
                        FROM lawyer_time_blocks
                        WHERE lawyer_id = ?
                          AND block_date >= ?
                          AND block_date < DATE_ADD(
                              CONCAT(?, '-01'),
                              INTERVAL 1 MONTH
                          )
                        ORDER BY
                            block_date ASC,
                            start_time ASC,
                            id ASC
                    `,
                    [
                        lawyer.id,
                        `${month}-01`,
                        month
                    ]
                );


            return res.json({
                success: true,
                availability:
                    weeklyRows,
                blocks:
                    blockRows,
                month
            });

        } catch (error) {

            console.error(
                "GET AVAILABILITY ERROR:",
                error
            );

            return res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Failed to load availability."
            });
        }
    }
);


// =====================================================
// SAVE WEEKLY AVAILABILITY
//
// PUT /api/availability
// =====================================================

router.put(
    "/",
    authMiddleware,
    async (req, res) => {

        const connection =
            await db.getConnection();

        try {

            const lawyer =
                await getLawyerForUser(
                    req.user.id
                );


            if (!lawyer) {

                connection.release();

                return res.status(403).json({
                    success: false,
                    message:
                        "Only advocate accounts can manage availability."
                });
            }


            const {
                availability
            } = req.body;


            if (
                !Array.isArray(
                    availability
                )
            ) {

                connection.release();

                return res.status(400).json({
                    success: false,
                    message:
                        "Availability must be an array."
                });
            }


            // -------------------------------------------------
            // NORMALIZE
            // -------------------------------------------------

            const normalized =
                availability.map(
                    (item) => ({
                        dayOfWeek:
                            Number(
                                item.dayOfWeek
                            ),

                        startTime:
                            item.startTime,

                        endTime:
                            item.endTime,

                        isAvailable:
                            item.isAvailable
                                ? 1
                                : 0
                    })
                );


            // -------------------------------------------------
            // VALIDATE
            // -------------------------------------------------

            for (
                const item
                of normalized
            ) {

                if (
                    !Number.isInteger(
                        item.dayOfWeek
                    ) ||
                    item.dayOfWeek <
                        DAY_MIN ||
                    item.dayOfWeek >
                        DAY_MAX
                ) {

                    connection.release();

                    return res.status(400).json({
                        success: false,
                        message:
                            "dayOfWeek must be between 1 and 7."
                    });
                }


                if (
                    !isValidTime(
                        item.startTime
                    ) ||
                    !isValidTime(
                        item.endTime
                    )
                ) {

                    connection.release();

                    return res.status(400).json({
                        success: false,
                        message:
                            "Each schedule requires valid start and end times."
                    });
                }


                if (
                    item.startTime >=
                    item.endTime
                ) {

                    connection.release();

                    return res.status(400).json({
                        success: false,
                        message:
                            "End time must be later than start time."
                    });
                }
            }


            // -------------------------------------------------
            // NO DUPLICATE DAYS
            // -------------------------------------------------

            const uniqueDays =
                new Set(
                    normalized.map(
                        item =>
                            item.dayOfWeek
                    )
                );


            if (
                uniqueDays.size !==
                normalized.length
            ) {

                connection.release();

                return res.status(400).json({
                    success: false,
                    message:
                        "Each weekday can appear only once."
                });
            }


            // -------------------------------------------------
            // TRANSACTION
            // -------------------------------------------------

            await connection.beginTransaction();


            for (
                const item
                of normalized
            ) {

                await connection.query(
                    `
                        INSERT INTO lawyer_availability
                        (
                            lawyer_id,
                            day_of_week,
                            start_time,
                            end_time,
                            is_available
                        )
                        VALUES (?, ?, ?, ?, ?)

                        ON DUPLICATE KEY UPDATE
                            start_time =
                                VALUES(start_time),

                            end_time =
                                VALUES(end_time),

                            is_available =
                                VALUES(is_available),

                            updated_at =
                                CURRENT_TIMESTAMP
                    `,
                    [
                        lawyer.id,
                        item.dayOfWeek,
                        item.startTime,
                        item.endTime,
                        item.isAvailable
                    ]
                );
            }


            await connection.commit();

            connection.release();


            return res.json({
                success: true,
                message:
                    "Weekly availability saved successfully."
            });

        } catch (error) {

            try {
                await connection.rollback();
            } catch (_) {}


            connection.release();


            console.error(
                "SAVE AVAILABILITY ERROR:",
                error
            );


            return res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Failed to save availability."
            });
        }
    }
);


// =====================================================
// CREATE TIME BLOCK / FULL DAY OFF
//
// POST /api/availability/blocks
// =====================================================

router.post(
    "/blocks",
    authMiddleware,
    async (req, res) => {

        try {

            const lawyer =
                await getLawyerForUser(
                    req.user.id
                );


            if (!lawyer) {
                return res.status(403).json({
                    success: false,
                    message:
                        "Only advocate accounts can manage availability."
                });
            }


            const {
                blockDate,
                startTime = null,
                endTime = null,
                blockType = "time_block",
                reason = null
            } = req.body;


            // -------------------------------------------------
            // DATE
            // -------------------------------------------------

            if (
                !isValidDate(
                    blockDate
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "A valid block date is required."
                });
            }


            // -------------------------------------------------
            // BLOCK TYPE
            // -------------------------------------------------

            if (
                ![
                    "time_block",
                    "full_day"
                ].includes(
                    blockType
                )
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid block type."
                });
            }


            // -------------------------------------------------
            // TIME BLOCK VALIDATION
            // -------------------------------------------------

            if (
                blockType ===
                "time_block"
            ) {

                if (
                    !isValidTime(
                        startTime
                    ) ||
                    !isValidTime(
                        endTime
                    )
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Start and end time are required for a time block."
                    });
                }


                if (
                    startTime >=
                    endTime
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "End time must be later than start time."
                    });
                }
            }


            // -------------------------------------------------
            // INSERT BLOCK
            // -------------------------------------------------

            const [result] =
                await db.query(
                    `
                        INSERT INTO lawyer_time_blocks
                        (
                            lawyer_id,
                            block_date,
                            start_time,
                            end_time,
                            block_type,
                            reason
                        )
                        VALUES (?, ?, ?, ?, ?, ?)
                    `,
                    [
                        lawyer.id,

                        blockDate,

                        blockType ===
                        "full_day"
                            ? null
                            : startTime,

                        blockType ===
                        "full_day"
                            ? null
                            : endTime,

                        blockType,

                        reason
                            ? String(reason)
                                .trim()
                                .slice(
                                    0,
                                    255
                                )
                            : null
                    ]
                );


            // -------------------------------------------------
            // GET CREATED BLOCK
            // -------------------------------------------------

            const [rows] =
                await db.query(
                    `
                        SELECT
                            id,
                            lawyer_id,
                            DATE_FORMAT(
                                block_date,
                                '%Y-%m-%d'
                            ) AS block_date,
                            TIME_FORMAT(
                                start_time,
                                '%H:%i'
                            ) AS start_time,
                            TIME_FORMAT(
                                end_time,
                                '%H:%i'
                            ) AS end_time,
                            block_type,
                            reason
                        FROM lawyer_time_blocks
                        WHERE id = ?
                        LIMIT 1
                    `,
                    [
                        result.insertId
                    ]
                );


            return res.status(201).json({
                success: true,
                message:
                    "Availability block added successfully.",
                block:
                    rows[0]
            });

        } catch (error) {

            console.error(
                "CREATE AVAILABILITY BLOCK ERROR:",
                error
            );


            return res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Failed to add availability block."
            });
        }
    }
);


// =====================================================
// DELETE TIME BLOCK / FULL DAY OFF
//
// DELETE /api/availability/blocks/:id
// =====================================================

router.delete(
    "/blocks/:id",
    authMiddleware,
    async (req, res) => {

        try {

            const lawyer =
                await getLawyerForUser(
                    req.user.id
                );


            if (!lawyer) {

                return res.status(403).json({
                    success: false,
                    message:
                        "Only advocate accounts can manage availability."
                });
            }


            const blockId =
                Number(
                    req.params.id
                );


            if (
                !Number.isInteger(
                    blockId
                ) ||
                blockId <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Invalid availability block ID."
                });
            }


            // -------------------------------------------------
            // DELETE ONLY THIS ADVOCATE'S BLOCK
            // -------------------------------------------------

            const [result] =
                await db.query(
                    `
                        DELETE FROM lawyer_time_blocks
                        WHERE id = ?
                          AND lawyer_id = ?
                    `,
                    [
                        blockId,
                        lawyer.id
                    ]
                );


            if (
                result.affectedRows === 0
            ) {

                return res.status(404).json({
                    success: false,
                    message:
                        "Availability block not found."
                });
            }


            return res.json({
                success: true,
                message:
                    "Availability block removed successfully."
            });

        } catch (error) {

            console.error(
                "DELETE AVAILABILITY BLOCK ERROR:",
                error
            );


            return res.status(500).json({
                success: false,
                message:
                    error.message ||
                    "Failed to remove availability block."
            });
        }
    }
);


// =====================================================
// EXPORT ROUTER
// =====================================================

module.exports = router;