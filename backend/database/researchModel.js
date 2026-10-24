const db = require("../db");

/*
|--------------------------------------------------------------------------
| RESEARCH MODEL
|--------------------------------------------------------------------------
|
| Handles:
|
| - Research conversations
| - Research messages
| - Uploaded research documents
| - Conversation ownership
| - Persistent research history
|
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| CREATE RESEARCH CONVERSATION
|--------------------------------------------------------------------------
*/

async function createResearchConversation(
  userId,
  title = "New Legal Research"
) {
  const cleanTitle =
    typeof title === "string" && title.trim()
      ? title.trim().slice(0, 200)
      : "New Legal Research";

  const [result] = await db.query(
    `
      INSERT INTO research_conversations
      (
        user_id,
        title
      )
      VALUES (?, ?)
    `,
    [
      userId,
      cleanTitle,
    ]
  );

  return result.insertId;
}

/*
|--------------------------------------------------------------------------
| GET ALL RESEARCH CONVERSATIONS
|--------------------------------------------------------------------------
*/

async function getResearchConversations(
  userId
) {
  const [rows] = await db.query(
    `
      SELECT
        id,
        user_id,
        title,
        created_at,
        updated_at
      FROM research_conversations
      WHERE user_id = ?
      ORDER BY updated_at DESC, id DESC
    `,
    [userId]
  );

  return rows;
}

/*
|--------------------------------------------------------------------------
| GET ONE RESEARCH CONVERSATION
|--------------------------------------------------------------------------
|
| Ownership is checked here as well as in the route.
|
|--------------------------------------------------------------------------
*/

async function getResearchConversation(
  conversationId,
  userId
) {
  const [rows] = await db.query(
    `
      SELECT
        id,
        user_id,
        title,
        created_at,
        updated_at
      FROM research_conversations
      WHERE id = ?
        AND user_id = ?
      LIMIT 1
    `,
    [
      conversationId,
      userId,
    ]
  );

  return rows.length
    ? rows[0]
    : null;
}

/*
|--------------------------------------------------------------------------
| UPDATE / TOUCH RESEARCH CONVERSATION
|--------------------------------------------------------------------------
|
| Updates updated_at whenever a research conversation is used.
|
| If newTitle is provided, the conversation title is updated too.
|
|--------------------------------------------------------------------------
*/

async function touchResearchConversation(
  conversationId,
  userId,
  newTitle = null
) {
  if (
    typeof newTitle === "string" &&
    newTitle.trim()
  ) {
    const title =
      newTitle.trim().slice(0, 200);

    const [result] = await db.query(
      `
        UPDATE research_conversations
        SET
          title = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
          AND user_id = ?
      `,
      [
        title,
        conversationId,
        userId,
      ]
    );

    return result.affectedRows > 0;
  }

  const [result] = await db.query(
    `
      UPDATE research_conversations
      SET
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND user_id = ?
    `,
    [
      conversationId,
      userId,
    ]
  );

  return result.affectedRows > 0;
}

/*
|--------------------------------------------------------------------------
| GET ALL MESSAGES
|--------------------------------------------------------------------------
*/

async function getResearchMessages(
  conversationId
) {
  const [rows] = await db.query(
    `
      SELECT
        id,
        conversation_id,
        sender,
        content,
        created_at
      FROM research_messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC, id ASC
    `,
    [conversationId]
  );

  return rows;
}

/*
|--------------------------------------------------------------------------
| GET RECENT MESSAGES
|--------------------------------------------------------------------------
|
| Used to provide conversational context to the AI without sending the
| entire research history on every request.
|
|--------------------------------------------------------------------------
*/

async function getRecentResearchMessages(
  conversationId,
  limit = 24
) {
  let safeLimit = Number(limit);

  if (
    !Number.isInteger(safeLimit) ||
    safeLimit <= 0
  ) {
    safeLimit = 24;
  }

  /*
  |--------------------------------------------------------------------------
  | Prevent excessively large queries.
  |--------------------------------------------------------------------------
  */

  safeLimit = Math.min(
    safeLimit,
    100
  );

  /*
  |--------------------------------------------------------------------------
  | MySQL does not safely parameterize LIMIT in every configuration.
  | Therefore the value is validated above and inserted as an integer.
  |--------------------------------------------------------------------------
  */

  const [rows] = await db.query(
    `
      SELECT
        id,
        conversation_id,
        sender,
        content,
        created_at
      FROM research_messages
      WHERE conversation_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ${safeLimit}
    `,
    [conversationId]
  );

  /*
  |--------------------------------------------------------------------------
  | The query retrieves newest messages first.
  |
  | Reverse them so the AI receives the conversation in normal
  | chronological order.
  |--------------------------------------------------------------------------
  */

  return rows.reverse();
}

/*
|--------------------------------------------------------------------------
| CREATE RESEARCH MESSAGE
|--------------------------------------------------------------------------
*/

async function createResearchMessage(
  conversationId,
  sender,
  content
) {
  const cleanSender =
    String(sender || "")
      .trim()
      .toLowerCase();

  /*
  |--------------------------------------------------------------------------
  | Only these two sender types are allowed.
  |--------------------------------------------------------------------------
  */

  if (
    cleanSender !== "user" &&
    cleanSender !== "ai"
  ) {
    throw new Error(
      "Invalid research message sender."
    );
  }

  const cleanContent =
    typeof content === "string"
      ? content.trim()
      : "";

  if (!cleanContent) {
    throw new Error(
      "Research message content cannot be empty."
    );
  }

  const [result] = await db.query(
    `
      INSERT INTO research_messages
      (
        conversation_id,
        sender,
        content
      )
      VALUES (?, ?, ?)
    `,
    [
      conversationId,
      cleanSender,
      cleanContent,
    ]
  );

  return result.insertId;
}

/*
|--------------------------------------------------------------------------
| ADD RESEARCH DOCUMENT
|--------------------------------------------------------------------------
|
| Stores the extracted/analyzed representation of an uploaded document.
|
| The original physical upload is intentionally NOT stored in this table.
| The research service passes extracted document information here.
|
|--------------------------------------------------------------------------
*/

async function addResearchDocument(
  conversationId,
  userId,
  fileName,
  fileType,
  extractedText
) {
  const cleanFileName =
    typeof fileName === "string"
      ? fileName.trim().slice(0, 255)
      : "";

  const cleanFileType =
    typeof fileType === "string"
      ? fileType.trim().slice(0, 150)
      : "";

  const cleanExtractedText =
    typeof extractedText === "string"
      ? extractedText.trim()
      : "";

  if (!cleanFileName) {
    throw new Error(
      "Research document filename is required."
    );
  }

  if (!cleanExtractedText) {
    throw new Error(
      "Research document content is empty."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Verify that the conversation belongs to the current user.
  |--------------------------------------------------------------------------
  */

  const conversation =
    await getResearchConversation(
      conversationId,
      userId
    );

  if (!conversation) {
    throw new Error(
      "Research chat not found."
    );
  }

  const [result] = await db.query(
    `
      INSERT INTO research_documents
      (
        conversation_id,
        user_id,
        file_name,
        file_type,
        extracted_text
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      conversationId,
      userId,
      cleanFileName,
      cleanFileType,
      cleanExtractedText,
    ]
  );

  return result.insertId;
}

/*
|--------------------------------------------------------------------------
| GET RESEARCH DOCUMENTS
|--------------------------------------------------------------------------
|
| Returns only documents belonging to the requested user's research
| conversation.
|
|--------------------------------------------------------------------------
*/

async function getResearchDocuments(
  conversationId,
  userId
) {
  const [rows] = await db.query(
    `
      SELECT
        id,
        conversation_id,
        user_id,
        file_name,
        file_type,
        extracted_text,
        created_at
      FROM research_documents
      WHERE conversation_id = ?
        AND user_id = ?
      ORDER BY created_at ASC, id ASC
    `,
    [
      conversationId,
      userId,
    ]
  );

  return rows;
}

/*
|--------------------------------------------------------------------------
| DELETE RESEARCH CONVERSATION
|--------------------------------------------------------------------------
|
| Deletes the conversation only when it belongs to the current user.
|
| If the database tables use ON DELETE CASCADE, messages and documents
| will automatically be removed.
|
| If your database does not use ON DELETE CASCADE, the explicit deletes
| below ensure there are no orphaned research records.
|
|--------------------------------------------------------------------------
*/

async function deleteResearchConversation(
  conversationId,
  userId
) {
  const connection =
    await db.getConnection();

  try {
    await connection.beginTransaction();

    /*
    |--------------------------------------------------------------------------
    | Verify ownership
    |--------------------------------------------------------------------------
    */

    const [conversationRows] =
      await connection.query(
        `
          SELECT id
          FROM research_conversations
          WHERE id = ?
            AND user_id = ?
          LIMIT 1
        `,
        [
          conversationId,
          userId,
        ]
      );

    if (
      conversationRows.length === 0
    ) {
      await connection.rollback();

      return false;
    }

    /*
    |--------------------------------------------------------------------------
    | Delete messages
    |--------------------------------------------------------------------------
    */

    await connection.query(
      `
        DELETE FROM research_messages
        WHERE conversation_id = ?
      `,
      [conversationId]
    );

    /*
    |--------------------------------------------------------------------------
    | Delete documents
    |--------------------------------------------------------------------------
    */

    await connection.query(
      `
        DELETE FROM research_documents
        WHERE conversation_id = ?
          AND user_id = ?
      `,
      [
        conversationId,
        userId,
      ]
    );

    /*
    |--------------------------------------------------------------------------
    | Delete conversation
    |--------------------------------------------------------------------------
    */

    const [result] =
      await connection.query(
        `
          DELETE FROM research_conversations
          WHERE id = ?
            AND user_id = ?
        `,
        [
          conversationId,
          userId,
        ]
      );

    await connection.commit();

    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();

    throw error;
  } finally {
    connection.release();
  }
}

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {
  createResearchConversation,
  getResearchConversations,
  getResearchConversation,
  touchResearchConversation,
  getResearchMessages,
  getRecentResearchMessages,
  createResearchMessage,
  addResearchDocument,
  getResearchDocuments,
  deleteResearchConversation,
};