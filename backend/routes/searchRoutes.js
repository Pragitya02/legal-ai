import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

/*
  GLOBAL CONTENT SEARCH

  Searches content available to the logged-in user:
  - AI Assistant messages
  - AI Research messages
  - AI Research documents
  - Cases
  - Advocate clients

  Query:
    GET /api/search?q=who
*/

router.get('/', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();

    if (!q) {
      return res.json({
        success: true,
        query: '',
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

    const userId =
      req.user?.id ||
      req.user?.userId ||
      req.user?.user_id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const searchTerm = `%${q}%`;
    const results = [];

    /*
      =====================================================
      AI ASSISTANT
      =====================================================
    */

    try {
      const [rows] = await pool.query(
        `
        SELECT
          id,
          conversation_id,
          role,
          content,
          created_at
        FROM assistant_messages
        WHERE user_id = ?
          AND content LIKE ?
        ORDER BY created_at DESC
        LIMIT 30
        `,
        [userId, searchTerm]
      );

      for (const row of rows) {
        results.push({
          id: `assistant-${row.id}`,
          type: 'AI Assistant',
          title: 'AI Assistant',
          content: getContext(row.content, q),
          fullContent: row.content,
          date: row.created_at,
          url: row.conversation_id
            ? `/dashboard/ai-assistant?conversation=${row.conversation_id}`
            : '/dashboard/ai-assistant',
        });
      }
    } catch (error) {
      console.warn(
        'AI Assistant search skipped:',
        error.message
      );
    }

    /*
      =====================================================
      AI RESEARCH MESSAGES
      =====================================================
    */

    try {
      const [rows] = await pool.query(
        `
        SELECT
          id,
          conversation_id,
          role,
          content,
          created_at
        FROM research_messages
        WHERE user_id = ?
          AND content LIKE ?
        ORDER BY created_at DESC
        LIMIT 30
        `,
        [userId, searchTerm]
      );

      for (const row of rows) {
        results.push({
          id: `research-message-${row.id}`,
          type: 'AI Research',
          title: 'AI Research',
          content: getContext(row.content, q),
          fullContent: row.content,
          date: row.created_at,
          url: '/advocate/ai-research',
        });
      }
    } catch (error) {
      console.warn(
        'AI Research message search skipped:',
        error.message
      );
    }

    /*
      =====================================================
      AI RESEARCH DOCUMENTS
      =====================================================
    */

    try {
      const [rows] = await pool.query(
        `
        SELECT
          id,
          title,
          extracted_text,
          created_at
        FROM research_documents
        WHERE user_id = ?
          AND extracted_text LIKE ?
        ORDER BY created_at DESC
        LIMIT 30
        `,
        [userId, searchTerm]
      );

      for (const row of rows) {
        results.push({
          id: `research-document-${row.id}`,
          type: 'Document',
          title: row.title || 'Research Document',
          content: getContext(
            row.extracted_text,
            q
          ),
          fullContent: row.extracted_text,
          date: row.created_at,
          url: '/advocate/ai-research',
        });
      }
    } catch (error) {
      console.warn(
        'Research document search skipped:',
        error.message
      );
    }

    /*
      =====================================================
      CASES
      =====================================================
    */

    try {
      const [rows] = await pool.query(
        `
        SELECT
          id,
          title,
          description,
          category,
          created_at
        FROM cases
        WHERE user_id = ?
          AND (
            title LIKE ?
            OR description LIKE ?
            OR category LIKE ?
          )
        ORDER BY created_at DESC
        LIMIT 30
        `,
        [
          userId,
          searchTerm,
          searchTerm,
          searchTerm,
        ]
      );

      for (const row of rows) {
        const caseText = [
          row.title || '',
          row.description || '',
          row.category || '',
        ]
          .filter(Boolean)
          .join(' ');

        results.push({
          id: `case-${row.id}`,
          type: 'Case',
          title: row.title || 'Case',
          content: getContext(caseText, q),
          fullContent: caseText,
          date: row.created_at,
          url: `/dashboard/cases/${row.id}`,
        });
      }
    } catch (error) {
      console.warn(
        'Case search skipped:',
        error.message
      );
    }

    /*
      =====================================================
      ADVOCATE CLIENTS
      =====================================================
    */

    try {
      const [rows] = await pool.query(
        `
        SELECT
          id,
          full_name,
          email
        FROM users
        WHERE role = 'citizen'
          AND (
            full_name LIKE ?
            OR email LIKE ?
          )
        ORDER BY full_name ASC
        LIMIT 30
        `,
        [searchTerm, searchTerm]
      );

      for (const row of rows) {
        results.push({
          id: `client-${row.id}`,
          type: 'Client',
          title: row.full_name || 'Client',
          content:
            `${row.full_name || ''} ${row.email || ''}`.trim(),
          fullContent:
            `${row.full_name || ''} ${row.email || ''}`.trim(),
          url: '/advocate/clients',
        });
      }
    } catch (error) {
      console.warn(
        'Client search skipped:',
        error.message
      );
    }

    /*
      =====================================================
      SORT RESULTS
      =====================================================
    */

    results.sort((a, b) => {
      const aDate = a.date
        ? new Date(a.date).getTime()
        : 0;

      const bDate = b.date
        ? new Date(b.date).getTime()
        : 0;

      return bDate - aDate;
    });

    return res.json({
      success: true,
      query: q,
      results: results.slice(0, 50),
      total: results.length,
    });
  } catch (error) {
    console.error(
      'Global search error:',
      error
    );

    return res.status(500).json({
      success: false,
      message: 'Search failed',
    });
  }
});


/*
  =====================================================
  EXTRACT MATCHING CONTEXT
  =====================================================

  Example:

  Text:
    "The witness who was present during the agreement
     confirmed the statement."

  Search:
    who

  Returns:
    "The witness who was present during the agreement
     confirmed the statement."
*/

function getContext(text, query) {
  if (!text) return '';

  const cleanText = String(text)
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) return '';

  const lowerText = cleanText.toLowerCase();
  const lowerQuery = query.toLowerCase();

  const index = lowerText.indexOf(
    lowerQuery
  );

  if (index === -1) {
    return cleanText.substring(0, 250);
  }

  /*
    Find sentence boundaries around the match.
  */

  let start = index;

  while (
    start > 0 &&
    !/[.!?]/.test(cleanText[start - 1])
  ) {
    start--;
  }

  let end =
    index + query.length;

  while (
    end < cleanText.length &&
    !/[.!?]/.test(cleanText[end])
  ) {
    end++;
  }

  const sentence = cleanText
    .substring(start, end + 1)
    .trim();

  /*
    Keep very large sentences manageable.
  */

  if (sentence.length <= 500) {
    return sentence;
  }

  const contextStart =
    Math.max(0, index - 180);

  const contextEnd =
    Math.min(
      cleanText.length,
      index + query.length + 250
    );

  return (
    (contextStart > 0 ? '...' : '') +
    cleanText.substring(
      contextStart,
      contextEnd
    ) +
    (contextEnd < cleanText.length
      ? '...'
      : '')
  );
}

export default router;