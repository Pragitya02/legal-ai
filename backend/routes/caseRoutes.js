const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../db");

const router = express.Router();

/*
=========================================================
HELPER
=========================================================
*/

function getUserId(req) {
  return Number(req.user?.id);
}

/*
=========================================================
GET ALL CASES FOR LOGGED-IN USER
GET /api/cases
=========================================================
*/

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid user authentication",
      });
    }

    console.log("");
    console.log("========================================");
    console.log("GET /api/cases");
    console.log("USER ID:", userId);
    console.log("========================================");

    const [rows] = await db.query(
      `
      SELECT
        id,
        user_id,
        title,
        description,
        category,
        severity,
        status,
        created_at,
        updated_at
      FROM cases
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [userId]
    );

    console.log("CASES FOUND:", rows.length);

    res.status(200).json({
      success: true,
      cases: rows,
    });
  } catch (error) {
    console.error("GET CASES ERROR:", error);

    res.status(500).json({
      success: false,
      message:
        error.message || "Failed to load cases",
    });
  }
});

/*
=========================================================
CREATE NEW CASE
POST /api/cases
=========================================================
*/

router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid user authentication",
      });
    }

    const {
      title,
      description,
      category,
      severity,
      status,
    } = req.body;

    console.log("");
    console.log("========================================");
    console.log("POST /api/cases");
    console.log("USER ID:", userId);
    console.log("TITLE:", title);
    console.log("CATEGORY:", category);
    console.log("SEVERITY:", severity);
    console.log("STATUS:", status);
    console.log("========================================");

    /*
    -------------------------------------------------------
    VALIDATE TITLE
    -------------------------------------------------------
    */

    if (
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Case title is required",
      });
    }

    /*
    -------------------------------------------------------
    VALIDATE DESCRIPTION
    -------------------------------------------------------
    */

    if (
      typeof description !== "string" ||
      !description.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Case description is required",
      });
    }

    /*
    -------------------------------------------------------
    SEVERITY
    -------------------------------------------------------
    */

    const allowedSeverities = [
      "Low",
      "Medium",
      "High",
      "Critical",
    ];

    const finalSeverity =
      allowedSeverities.includes(
        severity
      )
        ? severity
        : "Medium";

    /*
    -------------------------------------------------------
    STATUS
    -------------------------------------------------------
    */

    const allowedStatuses = [
      "open",
      "in_progress",
      "resolved",
      "closed",
    ];

    const finalStatus =
      allowedStatuses.includes(
        status
      )
        ? status
        : "open";

    /*
    -------------------------------------------------------
    CATEGORY
    -------------------------------------------------------
    */

    const finalCategory =
      typeof category === "string" &&
      category.trim()
        ? category.trim()
        : "General Legal Matter";

    /*
    -------------------------------------------------------
    INSERT INTO CASES
    -------------------------------------------------------
    */

    const [result] = await db.query(
      `
      INSERT INTO cases
      (
        user_id,
        title,
        description,
        category,
        severity,
        status
      )
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        title.trim(),
        description.trim(),
        finalCategory,
        finalSeverity,
        finalStatus,
      ]
    );

    const caseId =
      result.insertId;

    console.log(
      "CASE CREATED SUCCESSFULLY"
    );

    console.log(
      "CASE ID:",
      caseId
    );

    /*
    -------------------------------------------------------
    GET THE NEW CASE
    -------------------------------------------------------
    */

    const [rows] = await db.query(
      `
      SELECT
        id,
        user_id,
        title,
        description,
        category,
        severity,
        status,
        created_at,
        updated_at
      FROM cases
      WHERE id = ?
      AND user_id = ?
      LIMIT 1
      `,
      [
        caseId,
        userId,
      ]
    );

    res.status(201).json({
      success: true,
      message:
        "Case created successfully",
      caseId: caseId,
      case:
        rows.length > 0
          ? rows[0]
          : null,
    });
  } catch (error) {
    console.error("");
    console.error(
      "========================================"
    );
    console.error(
      "CREATE CASE ERROR"
    );
    console.error(error);
    console.error(
      "========================================"
    );

    res.status(500).json({
      success: false,
      message:
        error.message ||
        "Failed to create case",
    });
  }
});

/*
=========================================================
GET SINGLE CASE
GET /api/cases/:id
=========================================================
*/

router.get(
  "/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const caseId =
        Number(req.params.id);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid user authentication",
        });
      }

      if (
        !Number.isInteger(caseId) ||
        caseId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid case ID",
        });
      }

      const [rows] =
        await db.query(
          `
          SELECT
            id,
            user_id,
            title,
            description,
            category,
            severity,
            status,
            created_at,
            updated_at
          FROM cases
          WHERE id = ?
          AND user_id = ?
          LIMIT 1
          `,
          [
            caseId,
            userId,
          ]
        );

      if (
        rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Case not found",
        });
      }

      res.status(200).json({
        success: true,
        case: rows[0],
      });
    } catch (error) {
      console.error(
        "GET SINGLE CASE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to load case",
      });
    }
  }
);


/*
=========================================================
CLOSE CASE
PATCH /api/cases/:id/close
=========================================================
*/

router.patch(
  "/:id/close",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = getUserId(req);
      const caseId = Number(req.params.id);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Invalid user authentication",
        });
      }

      if (
        !Number.isInteger(caseId) ||
        caseId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid case ID",
        });
      }

      const [result] = await db.query(
        `
        UPDATE cases
        SET status = 'closed',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        AND user_id = ?
        `,
        [caseId, userId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Case not found",
        });
      }

      const [rows] = await db.query(
        `
        SELECT
          id,
          user_id,
          title,
          description,
          category,
          severity,
          status,
          created_at,
          updated_at
        FROM cases
        WHERE id = ?
        AND user_id = ?
        LIMIT 1
        `,
        [caseId, userId]
      );

      return res.status(200).json({
        success: true,
        message: "Case closed successfully",
        case: rows[0] || null,
      });
    } catch (error) {
      console.error("CLOSE CASE ERROR:", error);

      return res.status(500).json({
        success: false,
        message: error.message || "Failed to close case",
      });
    }
  }
);


/*
=========================================================
CASE NOTES
GET  /api/cases/:id/notes
PUT  /api/cases/:id/notes
=========================================================
*/

async function ensureCaseNotesTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS case_notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      case_id INT NOT NULL,
      user_id INT NOT NULL,
      note_text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_case_notes_case_user (case_id, user_id),
      INDEX idx_case_notes_user (user_id),
      INDEX idx_case_notes_case (case_id)
    )
  `);
}

router.get("/:id/notes", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    const caseId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid user authentication",
      });
    }

    if (!Number.isInteger(caseId) || caseId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid case ID",
      });
    }

    await ensureCaseNotesTable();

    const [caseRows] = await db.query(
      `SELECT id FROM cases WHERE id = ? AND user_id = ? LIMIT 1`,
      [caseId, userId]
    );

    if (caseRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    const [rows] = await db.query(
      `
      SELECT id, case_id, note_text, created_at, updated_at
      FROM case_notes
      WHERE case_id = ? AND user_id = ?
      LIMIT 1
      `,
      [caseId, userId]
    );

    return res.status(200).json({
      success: true,
      note: rows[0] || null,
    });
  } catch (error) {
    console.error("GET CASE NOTES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load notes",
    });
  }
});

router.put("/:id/notes", authMiddleware, async (req, res) => {
  try {
    const userId = getUserId(req);
    const caseId = Number(req.params.id);
    const noteText =
      typeof req.body?.note_text === "string"
        ? req.body.note_text
        : "";

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid user authentication",
      });
    }

    if (!Number.isInteger(caseId) || caseId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid case ID",
      });
    }

    if (noteText.length > 20000) {
      return res.status(400).json({
        success: false,
        message: "Notes are limited to 20,000 characters",
      });
    }

    await ensureCaseNotesTable();

    const [caseRows] = await db.query(
      `SELECT id FROM cases WHERE id = ? AND user_id = ? LIMIT 1`,
      [caseId, userId]
    );

    if (caseRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Case not found",
      });
    }

    await db.query(
      `
      INSERT INTO case_notes (case_id, user_id, note_text)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        note_text = VALUES(note_text),
        updated_at = CURRENT_TIMESTAMP
      `,
      [caseId, userId, noteText]
    );

    const [rows] = await db.query(
      `
      SELECT id, case_id, note_text, created_at, updated_at
      FROM case_notes
      WHERE case_id = ? AND user_id = ?
      LIMIT 1
      `,
      [caseId, userId]
    );

    return res.status(200).json({
      success: true,
      message: "Notes saved successfully",
      note: rows[0] || null,
    });
  } catch (error) {
    console.error("SAVE CASE NOTES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to save notes",
    });
  }
});


/*
=========================================================
DELETE CASE
DELETE /api/cases/:id
=========================================================
*/

router.delete(
  "/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const userId = getUserId(req);

      const caseId =
        Number(req.params.id);

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid user authentication",
        });
      }

      if (
        !Number.isInteger(caseId) ||
        caseId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid case ID",
        });
      }

      const [result] =
        await db.query(
          `
          DELETE FROM cases
          WHERE id = ?
          AND user_id = ?
          `,
          [
            caseId,
            userId,
          ]
        );

      if (
        result.affectedRows === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Case not found",
        });
      }

      res.status(200).json({
        success: true,
        message:
          "Case deleted successfully",
      });
    } catch (error) {
      console.error(
        "DELETE CASE ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Failed to delete case",
      });
    }
  }
);

module.exports = router;