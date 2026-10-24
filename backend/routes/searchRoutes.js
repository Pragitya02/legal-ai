const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const db = require("../db");

const router = express.Router();

const MAX_RESULTS_PER_SOURCE = 30;
const MAX_FINAL_RESULTS = 50;
const MAX_QUERY_LENGTH = 120;
const MAX_CONTEXT_LENGTH = 600;

/*
|--------------------------------------------------------------------------
| CLEAN SEARCH QUERY
|--------------------------------------------------------------------------
*/

function cleanQuery(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/[\%_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_QUERY_LENGTH);
}

/*
|--------------------------------------------------------------------------
| ESCAPE REGEX CHARACTERS
|--------------------------------------------------------------------------
*/

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/*
|--------------------------------------------------------------------------
| GET MATCHING SENTENCE / CONTEXT
|--------------------------------------------------------------------------
|
| Example:
|
| Search: who
|
| Text:
| "The witness who was present during the agreement
| confirmed the statement."
|
| Result:
| "The witness who was present during the agreement confirmed the statement."
|
|--------------------------------------------------------------------------
*/

function getContext(text, query) {
  if (!text) {
    return "";
  }

  const cleanText = String(text)
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanText) {
    return "";
  }

  const lowerText = cleanText.toLocaleLowerCase();
  const lowerQuery = query.toLocaleLowerCase();

  const index = lowerText.indexOf(lowerQuery);

  /*
  |--------------------------------------------------------------------------
  | No direct match
  |--------------------------------------------------------------------------
  */

  if (index === -1) {
    return cleanText.substring(0, MAX_CONTEXT_LENGTH);
  }

  /*
  |--------------------------------------------------------------------------
  | Find sentence start
  |--------------------------------------------------------------------------
  */

  let start = index;

  while (
    start > 0 &&
    !/[.!?]/.test(cleanText[start - 1])
  ) {
    start--;
  }

  /*
  |--------------------------------------------------------------------------
  | Find sentence end
  |--------------------------------------------------------------------------
  */

  let end = index + query.length;

  while (
    end < cleanText.length &&
    !/[.!?]/.test(cleanText[end])
  ) {
    end++;
  }

  let sentence = cleanText
    .substring(start, Math.min(end + 1, cleanText.length))
    .trim();

  /*
  |--------------------------------------------------------------------------
  | Very large sentence
  |--------------------------------------------------------------------------
  */

  if (sentence.length > MAX_CONTEXT_LENGTH) {
    const matchPositionInSentence =
      sentence.toLocaleLowerCase().indexOf(lowerQuery);

    const contextStart = Math.max(
      0,
      matchPositionInSentence - 200
    );

    const contextEnd = Math.min(
      sentence.length,
      matchPositionInSentence +
        query.length +
        300
    );

    sentence =
      (contextStart > 0 ? "..." : "") +
      sentence.substring(contextStart, contextEnd) +
      (contextEnd < sentence.length ? "..." : "");
  }

  return sentence;
}

/*
|--------------------------------------------------------------------------
| FIND MATCH POSITIONS
|--------------------------------------------------------------------------
*/

function getMatchPositions(text, query) {
  if (!text || !query) {
    return [];
  }

  const source = String(text);
  const lowerSource = source.toLocaleLowerCase();
  const lowerQuery = query.toLocaleLowerCase();

  const positions = [];

  let start = 0;

  while (positions.length < 10) {
    const index = lowerSource.indexOf(
      lowerQuery,
      start
    );

    if (index === -1) {
      break;
    }

    positions.push(index);

    start =
      index +
      Math.max(1, lowerQuery.length);
  }

  return positions;
}

/*
|--------------------------------------------------------------------------
| ADD TEXT RESULT
|--------------------------------------------------------------------------
*/

function addTextResult({
  results,
  row,
  id,
  type,
  title,
  text,
  query,
  date,
  url,
  field,
}) {
  if (!text) {
    return;
  }

  const cleanText = String(text)
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanText) {
    return;
  }

  const positions = getMatchPositions(
    cleanText,
    query
  );

  if (positions.length === 0) {
    return;
  }

  /*
  |--------------------------------------------------------------------------
  | Add up to 3 matching contexts from the same record
  |--------------------------------------------------------------------------
  */

  const usedContexts = new Set();

  for (
    let i = 0;
    i < Math.min(positions.length, 3);
    i++
  ) {
    const matchPosition = positions[i];

    const context = getContext(
      cleanText.substring(
        Math.max(0, matchPosition - 250),
        Math.min(
          cleanText.length,
          matchPosition + query.length + 450
        )
      ),
      query
    );

    if (!context) {
      continue;
    }

    if (usedContexts.has(context)) {
      continue;
    }

    usedContexts.add(context);

    results.push({
      id: `${id}-${field || "content"}-${i}`,
      type,
      title,
      content: context,
      fullContent: cleanText,
      date: date || null,
      url,
      field: field || "content",
      query,
    });
  }
}

/*
|--------------------------------------------------------------------------
| GLOBAL CONTENT SEARCH
|--------------------------------------------------------------------------
|
| GET /api/search?q=who
|
| Searches:
|
| - AI Assistant
| - AI Research
| - Research Documents
| - Cases
| - Advocate Clients
|
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  authMiddleware,
  async (req, res) => {
    try {
      /*
      |--------------------------------------------------------------------------
      | QUERY
      |--------------------------------------------------------------------------
      */

      const q = cleanQuery(req.query.q);

      if (!q) {
        return res.json({
          success: true,
          query: "",
          results: [],
          total: 0,
        });
      }

      if (q.length < 2) {
        return res.json({
          success: true,
          query: q,
          results: [],
          total: 0,
        });
      }

      /*
      |--------------------------------------------------------------------------
      | USER
      |--------------------------------------------------------------------------
      */

      const userId = Number(
        req.user?.id ||
        req.user?.userId ||
        req.user?.user_id
      );

      if (
        !Number.isInteger(userId) ||
        userId <= 0
      ) {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
        });
      }

      console.log(
        `[GLOBAL SEARCH] user=${userId} query="${q}"`
      );

      const searchTerm = `%${q}%`;

      const results = [];

      /*
      |--------------------------------------------------------------------------
      | 1. AI ASSISTANT
      |--------------------------------------------------------------------------
      |
      | Your actual chat system uses:
      |
      | conversations
      | messages
      |
      | and conversations are owned by user_id.
      |
      |--------------------------------------------------------------------------
      */

      try {
        const [rows] = await db.query(
          `
          SELECT
            m.id,
            m.conversation_id,
            m.sender,
            m.message,
            m.created_at,
            c.title AS conversation_title
          FROM messages m
          INNER JOIN conversations c
            ON c.id = m.conversation_id
          WHERE c.user_id = ?
            AND m.message LIKE ?
          ORDER BY
            m.created_at DESC,
            m.id DESC
          LIMIT ?
          `,
          [
            userId,
            searchTerm,
            MAX_RESULTS_PER_SOURCE,
          ]
        );

        for (const row of rows) {
          addTextResult({
            results,
            row,
            id: `assistant-${row.id}`,
            type: "AI Assistant",
            title:
              row.conversation_title ||
              "AI Assistant",
            text: row.message,
            query: q,
            date: row.created_at,
            url: row.conversation_id
              ? `/dashboard/ai-assistant?conversation=${row.conversation_id}`
              : "/dashboard/ai-assistant",
            field: "message",
          });
        }

        console.log(
          `[GLOBAL SEARCH] AI Assistant matches=${rows.length}`
        );
      } catch (error) {
        console.warn(
          "[GLOBAL SEARCH] AI Assistant skipped:",
          error.message
        );
      }

      /*
      |--------------------------------------------------------------------------
      | 2. AI RESEARCH MESSAGES
      |--------------------------------------------------------------------------
      |
      | Uses the research conversation/message structure
      | from your existing backend.
      |
      |--------------------------------------------------------------------------
      */

      try {
        const [rows] = await db.query(
          `
          SELECT
            rm.id,
            rm.conversation_id,
            rm.sender,
            rm.content,
            rm.created_at,
            rc.title AS conversation_title
          FROM research_messages rm
          INNER JOIN research_conversations rc
            ON rc.id = rm.conversation_id
          WHERE rc.user_id = ?
            AND rm.content LIKE ?
          ORDER BY
            rm.created_at DESC,
            rm.id DESC
          LIMIT ?
          `,
          [
            userId,
            searchTerm,
            MAX_RESULTS_PER_SOURCE,
          ]
        );

        for (const row of rows) {
          addTextResult({
            results,
            row,
            id: `research-message-${row.id}`,
            type: "AI Research",
            title:
              row.conversation_title ||
              "AI Research",
            text: row.content,
            query: q,
            date: row.created_at,
            url: row.conversation_id
              ? `/advocate/ai-research?conversation=${row.conversation_id}`
              : "/advocate/ai-research",
            field: "content",
          });
        }

        console.log(
          `[GLOBAL SEARCH] AI Research matches=${rows.length}`
        );
      } catch (error) {
        console.warn(
          "[GLOBAL SEARCH] AI Research skipped:",
          error.message
        );
      }

      /*
      |--------------------------------------------------------------------------
      | 3. AI RESEARCH DOCUMENTS
      |--------------------------------------------------------------------------
      */

      try {
        const [rows] = await db.query(
          `
          SELECT
            rd.id,
            rd.file_name,
            rd.extracted_text,
            rd.created_at,
            rc.title AS conversation_title
          FROM research_documents rd
          INNER JOIN research_conversations rc
            ON rc.id = rd.conversation_id
          WHERE rd.user_id = ?
            AND rd.extracted_text LIKE ?
          ORDER BY
            rd.created_at DESC,
            rd.id DESC
          LIMIT ?
          `,
          [
            userId,
            searchTerm,
            MAX_RESULTS_PER_SOURCE,
          ]
        );

        for (const row of rows) {
          addTextResult({
            results,
            row,
            id: `research-document-${row.id}`,
            type: "Document",
            title:
              row.file_name ||
              "Research Document",
            text: row.extracted_text,
            query: q,
            date: row.created_at,
            url: "/advocate/ai-research",
            field: "extracted_text",
          });
        }

        console.log(
          `[GLOBAL SEARCH] Documents matches=${rows.length}`
        );
      } catch (error) {
        console.warn(
          "[GLOBAL SEARCH] Documents skipped:",
          error.message
        );
      }

      /*
      |--------------------------------------------------------------------------
      | 4. CASES
      |--------------------------------------------------------------------------
      */

      try {
        const [rows] = await db.query(
          `
          SELECT
            id,
            title,
            description,
            category,
            created_at,
            updated_at
          FROM cases
          WHERE user_id = ?
            AND (
              title LIKE ?
              OR description LIKE ?
              OR category LIKE ?
            )
          ORDER BY
            updated_at DESC,
            id DESC
          LIMIT ?
          `,
          [
            userId,
            searchTerm,
            searchTerm,
            searchTerm,
            MAX_RESULTS_PER_SOURCE,
          ]
        );

        for (const row of rows) {
          /*
          |--------------------------------------------------------------------------
          | Search each case field separately.
          |--------------------------------------------------------------------------
          */

          addTextResult({
            results,
            row,
            id: `case-${row.id}`,
            type: "Case",
            title:
              row.title ||
              `Case #${row.id}`,
            text: row.title,
            query: q,
            date:
              row.updated_at ||
              row.created_at,
            url: `/dashboard/cases/${row.id}`,
            field: "title",
          });

          addTextResult({
            results,
            row,
            id: `case-${row.id}`,
            type: "Case",
            title:
              row.title ||
              `Case #${row.id}`,
            text: row.description,
            query: q,
            date:
              row.updated_at ||
              row.created_at,
            url: `/dashboard/cases/${row.id}`,
            field: "description",
          });

          addTextResult({
            results,
            row,
            id: `case-${row.id}`,
            type: "Case",
            title:
              row.title ||
              `Case #${row.id}`,
            text: row.category,
            query: q,
            date:
              row.updated_at ||
              row.created_at,
            url: `/dashboard/cases/${row.id}`,
            field: "category",
          });
        }

        console.log(
          `[GLOBAL SEARCH] Case matches=${rows.length}`
        );
      } catch (error) {
        console.warn(
          "[GLOBAL SEARCH] Cases skipped:",
          error.message
        );
      }

      /*
      |--------------------------------------------------------------------------
      | 5. ADVOCATE CLIENTS
      |--------------------------------------------------------------------------
      |
      | IMPORTANT:
      | Only search clients associated with the logged-in advocate.
      |
      |--------------------------------------------------------------------------
      */

      try {
        const role = String(
          req.user?.role || ""
        ).toLowerCase();

        if (role === "lawyer") {
          const [rows] = await db.query(
            `
            SELECT DISTINCT
              u.id,
              u.full_name,
              u.email
            FROM appointments a
            INNER JOIN users u
              ON u.id = a.citizen_id
            WHERE a.lawyer_id = ?
              AND a.status IN (
                'confirmed',
                'completed'
              )
              AND (
                u.full_name LIKE ?
                OR u.email LIKE ?
              )
            ORDER BY
              u.full_name ASC
            LIMIT ?
            `,
            [
              userId,
              searchTerm,
              searchTerm,
              MAX_RESULTS_PER_SOURCE,
            ]
          );

          for (const row of rows) {
            const clientText =
              `${row.full_name || ""} ${row.email || ""}`
                .trim();

            results.push({
              id: `client-${row.id}`,
              type: "Client",
              title:
                row.full_name ||
                "Client",
              content: clientText,
              fullContent: clientText,
              date: null,
              url: "/advocate/clients",
              field: "client",
              query: q,
            });
          }

          console.log(
            `[GLOBAL SEARCH] Client matches=${rows.length}`
          );
        }
      } catch (error) {
        console.warn(
          "[GLOBAL SEARCH] Clients skipped:",
          error.message
        );
      }

      /*
      |--------------------------------------------------------------------------
      | REMOVE DUPLICATES
      |--------------------------------------------------------------------------
      */

      const uniqueResults = [];

      const seen = new Set();

      for (const result of results) {
        const key = [
          result.type,
          result.id,
          result.content,
        ].join("|");

        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        uniqueResults.push(result);
      }

      /*
      |--------------------------------------------------------------------------
      | SORT
      |--------------------------------------------------------------------------
      */

      uniqueResults.sort((a, b) => {
        const aDate = a.date
          ? new Date(a.date).getTime()
          : 0;

        const bDate = b.date
          ? new Date(b.date).getTime()
          : 0;

        return bDate - aDate;
      });

      const finalResults =
        uniqueResults.slice(
          0,
          MAX_FINAL_RESULTS
        );

      console.log(
        `[GLOBAL SEARCH] total=${finalResults.length}`
      );

      /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

      return res.json({
        success: true,
        query: q,
        results: finalResults,
        total: finalResults.length,
      });
    } catch (error) {
      console.error(
        "[GLOBAL SEARCH] Fatal error:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Search failed",
      });
    }
  }
);

module.exports = router;