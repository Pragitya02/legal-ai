const express = require("express");
const multer = require("multer");

const authMiddleware = require("../middleware/authMiddleware");
const { extractDocument } = require("../services/researchDocumentService");
const { researchChatAgent } = require("../agents/researchChatAgent");

const {
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
} = require("../database/researchModel");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",

  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
]);

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function isValidConversationId(value) {
  const id = Number(value);

  return Number.isInteger(id) && id > 0;
}

function cleanString(value, maxLength = 10000) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function getFileExtension(filename = "") {
  const lastDot = filename.lastIndexOf(".");

  if (lastDot === -1) {
    return "";
  }

  return filename.slice(lastDot).toLowerCase();
}

function isAllowedFile(file) {
  if (!file) {
    return false;
  }

  const mimeAllowed = ALLOWED_MIME_TYPES.has(file.mimetype);
  const extensionAllowed = ALLOWED_EXTENSIONS.has(
    getFileExtension(file.originalname)
  );

  return mimeAllowed && extensionAllowed;
}

/*
|--------------------------------------------------------------------------
| MULTER CONFIGURATION
|--------------------------------------------------------------------------
|
| Files are kept in memory because the research service immediately
| extracts/analyzes their contents.
|
*/

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },

  fileFilter: (req, file, cb) => {
    if (!isAllowedFile(file)) {
      return cb(
        new Error(
          "Unsupported document type. Please upload a PDF, DOCX, PNG, JPG, JPEG, WEBP, or GIF file."
        )
      );
    }

    cb(null, true);
  },
});

/*
|--------------------------------------------------------------------------
| GET ALL RESEARCH CONVERSATIONS
|--------------------------------------------------------------------------
|
| Used by the Advocate AI Research sidebar/history.
|
*/

router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const conversations = await getResearchConversations(userId);

    return res.json({
      success: true,
      conversations: Array.isArray(conversations)
        ? conversations
        : [],
    });
  } catch (error) {
    console.error(
      "RESEARCH GET CONVERSATIONS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to load research chats.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| CREATE NEW RESEARCH CONVERSATION
|--------------------------------------------------------------------------
|
| Every "New Research" creates an independent research session.
|
*/

router.post("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    let title = cleanString(req.body?.title, 200);

    if (!title) {
      title = "New Legal Research";
    }

    const conversationId = await createResearchConversation(
      userId,
      title
    );

    return res.status(201).json({
      success: true,
      conversationId,
    });
  } catch (error) {
    console.error(
      "RESEARCH CREATE CONVERSATION ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create research chat.",
    });
  }
});

/*
|--------------------------------------------------------------------------
| GET ONE RESEARCH CONVERSATION
|--------------------------------------------------------------------------
|
| Returns:
| - conversation information
| - complete message history
| - uploaded research documents
|
*/

router.get(
  "/conversations/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const conversationId = Number(req.params.id);
      const userId = req.user.id;

      if (!isValidConversationId(conversationId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid research chat ID.",
        });
      }

      const conversation = await getResearchConversation(
        conversationId,
        userId
      );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Research chat not found.",
        });
      }

      const [messages, documents] = await Promise.all([
        getResearchMessages(conversationId),
        getResearchDocuments(
          conversationId,
          userId
        ),
      ]);

      return res.json({
        success: true,

        conversation,

        messages: Array.isArray(messages)
          ? messages
          : [],

        documents: Array.isArray(documents)
          ? documents.map(
              ({
                id: documentId,
                file_name,
                file_type,
                created_at,
              }) => ({
                id: documentId,
                file_name,
                file_type,
                created_at,
              })
            )
          : [],
      });
    } catch (error) {
      console.error(
        "RESEARCH GET CHAT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message: "Failed to load research chat.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| UPLOAD + ANALYZE RESEARCH DOCUMENT
|--------------------------------------------------------------------------
|
| Supported:
| - PDF
| - DOCX
| - PNG
| - JPG/JPEG
| - WEBP
| - GIF
|
| The document is:
| 1. validated
| 2. extracted
| 3. stored against the research conversation
| 4. passed to the research AI
| 5. AI's analysis is saved in the chat
|
*/

router.post(
  "/conversations/:id/documents",
  authMiddleware,
  upload.single("document"),
  async (req, res) => {
    try {
      const conversationId = Number(req.params.id);
      const userId = req.user.id;

      if (!isValidConversationId(conversationId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid research chat ID.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "Please upload a PDF, DOCX, or supported image document.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | VERIFY CONVERSATION OWNERSHIP
      |--------------------------------------------------------------------------
      */

      const conversation =
        await getResearchConversation(
          conversationId,
          userId
        );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Research chat not found.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | EXTRA DOCUMENT VALIDATION
      |--------------------------------------------------------------------------
      */

      if (!req.file.buffer || !req.file.buffer.length) {
        return res.status(400).json({
          success: false,
          message: "The uploaded document is empty.",
        });
      }

      if (!isAllowedFile(req.file)) {
        return res.status(400).json({
          success: false,
          message:
            "Unsupported document type. Please upload a PDF, DOCX, PNG, JPG, JPEG, WEBP, or GIF file.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | EXTRACT DOCUMENT CONTENT
      |--------------------------------------------------------------------------
      */

      let extractedText = "";

      try {
        extractedText = await extractDocument(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
      } catch (extractError) {
        console.error(
          "RESEARCH DOCUMENT EXTRACTION ERROR:",
          extractError
        );

        return res.status(422).json({
          success: false,
          message:
            "The document could not be read or analyzed. Please make sure the file is valid and readable.",
        });
      }

      extractedText = cleanString(
        extractedText,
        500000
      );

      if (!extractedText) {
        return res.status(422).json({
          success: false,
          message:
            "No readable information could be extracted from this document.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | SAVE DOCUMENT
      |--------------------------------------------------------------------------
      */

      const documentId = await addResearchDocument(
        conversationId,
        userId,
        req.file.originalname,
        req.file.mimetype,
        extractedText
      );

      /*
      |--------------------------------------------------------------------------
      | UPDATE CHAT TITLE
      |--------------------------------------------------------------------------
      */

      const documentTitle =
        cleanString(
          req.file.originalname,
          200
        ) || "Legal Research";

      await touchResearchConversation(
        conversationId,
        userId,
        conversation.title === "New Legal Research"
          ? documentTitle
          : null
      );

      /*
      |--------------------------------------------------------------------------
      | LOAD CONTEXT FOR AI
      |--------------------------------------------------------------------------
      */

      const [history, documents] =
        await Promise.all([
          getRecentResearchMessages(
            conversationId,
            12
          ),

          getResearchDocuments(
            conversationId,
            userId
          ),
        ]);

      /*
      |--------------------------------------------------------------------------
      | INITIAL DOCUMENT ANALYSIS
      |--------------------------------------------------------------------------
      |
      | Important:
      | The AI is instructed not to invent visual information.
      | If the extracted content cannot verify something such as a
      | signature, stamp, seal, or page-level visual element, it must
      | explicitly say that it cannot verify it.
      |
      */

      const analysisPrompt = `
Analyze the newly uploaded legal document:

"${documentTitle}"

This is a legal-document research session for an advocate.

Read the available document content carefully and provide an advocate-facing initial analysis.

Cover, where the document actually provides the information:

1. Document type / nature of the document
2. Case number or case identifier
3. Court / authority
4. Parties / names
5. Important dates
6. Relevant legal sections / Acts / provisions
7. FIR number or police-station information, if present
8. Important factual information
9. Important orders / findings / directions
10. Missing or unclear information
11. Page-specific information when it can actually be established
12. Signature, stamp, seal, attestation, or other visual elements ONLY when they can genuinely be verified from the available document information

STRICT ACCURACY RULES:

- Do NOT invent facts.
- Do NOT guess missing names, dates, numbers, sections, signatures, stamps, seals, or case details.
- If something is not present, say that it was not found.
- If something cannot be verified from the available document content, explicitly say that it cannot be verified.
- Do not treat assumptions as facts.
- Do not claim that you checked a government database, court database, police database, or live external source unless an actual tool/source was used.
- Distinguish clearly between information found in the document and information that cannot be established.
- Keep the answer useful for an advocate.
- Stay strictly within legal, case, and document research.
`;

      let documentMessage = "";

      try {
        documentMessage =
          await researchChatAgent({
            message: analysisPrompt,
            history: Array.isArray(history)
              ? history
              : [],
            documents: Array.isArray(documents)
              ? documents
              : [],
          });
      } catch (aiError) {
        console.error(
          "RESEARCH DOCUMENT AI ERROR:",
          aiError
        );

        return res.status(502).json({
          success: false,
          message:
            "The document was uploaded, but AI analysis failed. Please try again.",
        });
      }

      const finalDocumentMessage =
        typeof documentMessage === "string" &&
        documentMessage.trim()
          ? documentMessage.trim()
          : "The document was uploaded successfully, but no analysis was generated.";

      /*
      |--------------------------------------------------------------------------
      | SAVE AI ANALYSIS
      |--------------------------------------------------------------------------
      */

      await createResearchMessage(
        conversationId,
        "ai",
        finalDocumentMessage
      );

      /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

      return res.status(201).json({
        success: true,

        document: {
          id: documentId,
          file_name: req.file.originalname,
          file_type: req.file.mimetype,
        },

        message: finalDocumentMessage,
      });
    } catch (error) {
      console.error(
        "RESEARCH DOCUMENT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          error.message ||
          "Failed to analyze document.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| SEND RESEARCH CHAT MESSAGE
|--------------------------------------------------------------------------
|
| Supports normal legal questions as well as follow-up questions
| about previously uploaded documents.
|
*/

router.post(
  "/conversations/:id/messages",
  authMiddleware,
  async (req, res) => {
    try {
      const conversationId = Number(req.params.id);
      const userId = req.user.id;

      const message = cleanString(
        req.body?.message,
        20000
      );

      if (!isValidConversationId(conversationId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid research chat ID.",
        });
      }

      if (!message) {
        return res.status(400).json({
          success: false,
          message: "Message is required.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | VERIFY CONVERSATION
      |--------------------------------------------------------------------------
      */

      const conversation =
        await getResearchConversation(
          conversationId,
          userId
        );

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Research chat not found.",
        });
      }

      /*
      |--------------------------------------------------------------------------
      | SAVE USER MESSAGE FIRST
      |--------------------------------------------------------------------------
      |
      | This makes the database history authoritative.
      |
      */

      await createResearchMessage(
        conversationId,
        "user",
        message
      );

      /*
      |--------------------------------------------------------------------------
      | LOAD UPDATED CONTEXT
      |--------------------------------------------------------------------------
      */

      const [history, documents] =
        await Promise.all([
          getRecentResearchMessages(
            conversationId,
            24
          ),

          getResearchDocuments(
            conversationId,
            userId
          ),
        ]);

      /*
      |--------------------------------------------------------------------------
      | ASK RESEARCH AI
      |--------------------------------------------------------------------------
      */

      let answer = "";

      try {
        answer = await researchChatAgent({
          message,
          history: Array.isArray(history)
            ? history
            : [],
          documents: Array.isArray(documents)
            ? documents
            : [],
        });
      } catch (aiError) {
        console.error(
          "RESEARCH CHAT AI ERROR:",
          aiError
        );

        return res.status(502).json({
          success: false,
          message:
            "The research AI could not generate a response. Please try again.",
        });
      }

      const finalAnswer =
        typeof answer === "string" &&
        answer.trim()
          ? answer.trim()
          : "I could not generate a research response.";

      /*
      |--------------------------------------------------------------------------
      | SAVE AI RESPONSE
      |--------------------------------------------------------------------------
      */

      await createResearchMessage(
        conversationId,
        "ai",
        finalAnswer
      );

      /*
      |--------------------------------------------------------------------------
      | UPDATE CHAT TITLE
      |--------------------------------------------------------------------------
      */

      if (
        conversation.title ===
        "New Legal Research"
      ) {
        const generatedTitle =
          message.length > 70
            ? `${message.slice(0, 67)}...`
            : message;

        await touchResearchConversation(
          conversationId,
          userId,
          generatedTitle
        );
      } else {
        await touchResearchConversation(
          conversationId,
          userId,
          null
        );
      }

      /*
      |--------------------------------------------------------------------------
      | RESPONSE
      |--------------------------------------------------------------------------
      */

      return res.json({
        success: true,
        message: finalAnswer,
      });
    } catch (error) {
      console.error(
        "RESEARCH CHAT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to generate research response.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| DELETE RESEARCH CONVERSATION
|--------------------------------------------------------------------------
|
| Only the owner of the conversation can delete it.
|
*/

router.delete(
  "/conversations/:id",
  authMiddleware,
  async (req, res) => {
    try {
      const conversationId = Number(
        req.params.id
      );

      const userId = req.user.id;

      if (!isValidConversationId(conversationId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid research chat ID.",
        });
      }

      const deleted =
        await deleteResearchConversation(
          conversationId,
          userId
        );

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message:
            "Research chat not found.",
        });
      }

      return res.json({
        success: true,
      });
    } catch (error) {
      console.error(
        "RESEARCH DELETE CHAT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete research chat.",
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| MULTER / UPLOAD ERROR HANDLER
|--------------------------------------------------------------------------
|
| This must be AFTER the routes using multer.
|
*/

router.use(
  (error, req, res, next) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          message:
            "Research document is too large. Maximum size is 25 MB.",
        });
      }

      if (error.code === "LIMIT_FILE_COUNT") {
        return res.status(400).json({
          success: false,
          message:
            "Only one research document can be uploaded at a time.",
        });
      }

      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Research upload failed.",
      });
    }

    if (error) {
      return res.status(400).json({
        success: false,
        message:
          error.message ||
          "Research upload failed.",
      });
    }

    next();
  }
);

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = router;