const express = require("express");
const multer = require("multer");
const path = require("path");

const authMiddleware = require("../middleware/authMiddleware");
const askAI = require("../services/groqService");
const { extractDocument } = require("../services/researchDocumentService");
const m = require("../database/workModel");

const router = express.Router();

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXT = new Set([".pdf", ".docx", ".txt", ".md", ".png", ".jpg", ".jpeg", ".webp"]);
const MAX_DOC_CHARS = 40000; // total document context sent to the model per request

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, cb) =>
    ALLOWED_EXT.has(path.extname(file.originalname || "").toLowerCase())
      ? cb(null, true)
      : cb(new Error("Unsupported file type. Upload PDF, DOCX, TXT, MD, PNG, JPG or WEBP.")),
});

const clean = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const validId = (v) => Number.isInteger(Number(v)) && Number(v) > 0;

const SYSTEM = `You are Nyaya Work, a general-purpose AI productivity assistant. Help with everyday tasks: answering questions, drafting and rewriting emails (with subject lines), changing tone, fixing grammar, translation, summarising, simplifying text, extracting key information, and writing applications, letters, reports, proposals, meeting notes/agendas, invoices, study notes and resumes. Be accurate, concise and professional. Use Markdown. Never invent facts about uploaded documents; if the answer is not in them, say so. Do not claim to have created a file; the app handles PDF creation.`;

const DOC_SYSTEM = `You are Nyaya Work's document writer. Produce a complete, professionally formatted document in Markdown. The FIRST line must be a single "# Title" heading. Use "##" section headings, short paragraphs, "-" bullets and "1." numbered lists, and "|" tables only when truly useful. Output only the document itself: no preamble, no code fences, no closing remarks. Use clear placeholders like [Your Name] only where personal details are unknown.`;

async function buildContext(conversationId, userId) {
  const docs = await m.getDocuments(conversationId, userId, true);
  let remaining = MAX_DOC_CHARS;
  let out = "";
  for (const d of docs) {
    if (remaining <= 0) break;
    const text = String(d.extracted_text || "").slice(0, remaining);
    remaining -= text.length;
    out += `\n--- Uploaded document: ${d.file_name} ---\n${text}\n`;
  }
  return out;
}

function buildPrompt(system, docContext, history, message) {
  const hist = history.map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`).join("\n\n");
  return [
    system,
    docContext ? `\nDocuments available in this conversation:${docContext}` : "",
    hist ? `\nConversation so far:\n${hist}` : "",
    `\nUser: ${message}\n\nAssistant:`,
  ].join("\n");
}

async function resolveConversation(req, titleSeed) {
  const userId = req.user.id;
  const raw = req.body?.conversationId;
  if (raw !== undefined && raw !== null && raw !== "") {
    if (!validId(raw)) return { error: [400, "Invalid conversation ID."] };
    const c = await m.getConversation(Number(raw), userId);
    if (!c) return { error: [404, "Conversation not found."] };
    return { id: c.id, isNew: false };
  }
  const id = await m.createConversation(userId, titleSeed.replace(/\s+/g, " ").slice(0, 60));
  return { id, isNew: true };
}

// ---------------------------------------------------------------- chat
router.post("/chat", authMiddleware, async (req, res) => {
  try {
    const message = clean(req.body?.message, 8000);
    if (!message) return res.status(400).json({ success: false, message: "Message is required." });

    const conv = await resolveConversation(req, message);
    if (conv.error) return res.status(conv.error[0]).json({ success: false, message: conv.error[1] });

    const [history, docContext] = await Promise.all([
      m.getRecentMessages(conv.id, 12),
      buildContext(conv.id, req.user.id),
    ]);

    await m.addMessage(conv.id, "user", message);
    const reply = await askAI(buildPrompt(SYSTEM, docContext, history, message));
    const content = String(reply || "").trim() || "I could not generate a response. Please try again.";
    const id = await m.addMessage(conv.id, "assistant", content);

    return res.json({ success: true, conversationId: conv.id, message: { id, role: "assistant", kind: "chat", content } });
  } catch (error) {
    console.error("WORK CHAT ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to get a response." });
  }
});

// ------------------------------------------------------- generate document
router.post("/documents/generate", authMiddleware, async (req, res) => {
  try {
    const prompt = clean(req.body?.prompt, 8000);
    if (!prompt) return res.status(400).json({ success: false, message: "Describe the document to create." });

    const conv = await resolveConversation(req, prompt);
    if (conv.error) return res.status(conv.error[0]).json({ success: false, message: conv.error[1] });

    const [history, docContext] = await Promise.all([
      m.getRecentMessages(conv.id, 6),
      buildContext(conv.id, req.user.id),
    ]);

    await m.addMessage(conv.id, "user", prompt);
    let content = String(await askAI(buildPrompt(DOC_SYSTEM, docContext, history, prompt)) || "")
      .replace(/^```(?:markdown|md)?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    if (!content) return res.status(502).json({ success: false, message: "The AI returned an empty document." });

    const h1 = content.match(/^#\s+(.+)$/m);
    const title = (h1 ? h1[1] : prompt).replace(/[*_`]/g, "").trim().slice(0, 200);
    if (!h1) content = `# ${title}\n\n${content}`;

    const id = await m.addMessage(conv.id, "assistant", content, "document", title);
    if (conv.isNew) await m.renameConversation(conv.id, title);

    return res.json({
      success: true,
      conversationId: conv.id,
      message: { id, role: "assistant", kind: "document", title, content },
    });
  } catch (error) {
    console.error("WORK GENERATE ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to generate the document." });
  }
});

// ------------------------------------------------------------ upload
router.post("/documents/upload", authMiddleware, (req, res, next) =>
  upload.single("document")(req, res, (err) =>
    err ? res.status(400).json({ success: false, message: err.message }) : next()
  ),
  async (req, res) => {
    try {
      if (!req.file || !req.file.buffer?.length) {
        return res.status(400).json({ success: false, message: "Please choose a non-empty file." });
      }
      const conv = await resolveConversation(req, `Document: ${req.file.originalname}`);
      if (conv.error) return res.status(conv.error[0]).json({ success: false, message: conv.error[1] });

      const ext = path.extname(req.file.originalname).toLowerCase();
      let text;
      try {
        text = [".txt", ".md"].includes(ext)
          ? req.file.buffer.toString("utf8")
          : await extractDocument(req.file.buffer, req.file.originalname, req.file.mimetype);
      } catch (e) {
        console.error("WORK EXTRACT ERROR:", e);
        if (conv.isNew) await m.deleteConversation(conv.id, req.user.id);
        return res.status(422).json({ success: false, message: "Could not read text from this file." });
      }
      text = String(text || "").replace(/\u0000/g, "").trim();
      if (!text) {
        if (conv.isNew) await m.deleteConversation(conv.id, req.user.id);
        return res.status(422).json({ success: false, message: "No readable text found in this file." });
      }

      const docId = await m.addDocument(conv.id, req.user.id, req.file.originalname, req.file.mimetype, text.slice(0, 90000));
      return res.status(201).json({
        success: true,
        conversationId: conv.id,
        document: { id: docId, file_name: req.file.originalname, file_type: req.file.mimetype },
      });
    } catch (error) {
      console.error("WORK UPLOAD ERROR:", error);
      return res.status(500).json({ success: false, message: "Failed to upload the document." });
    }
  }
);

// ------------------------------------------------------ conversations
router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const conversations = await m.listConversations(req.user.id, clean(req.query.q, 100));
    return res.json({ success: true, conversations });
  } catch (error) {
    console.error("WORK LIST ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load conversations." });
  }
});

router.get("/conversations/:id", authMiddleware, async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid conversation ID." });
    const id = Number(req.params.id);
    const conversation = await m.getConversation(id, req.user.id);
    if (!conversation) return res.status(404).json({ success: false, message: "Conversation not found." });
    const [messages, documents] = await Promise.all([m.getMessages(id), m.getDocuments(id, req.user.id)]);
    return res.json({ success: true, conversation, messages, documents });
  } catch (error) {
    console.error("WORK GET ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to load conversation." });
  }
});

router.delete("/conversations/:id", authMiddleware, async (req, res) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid conversation ID." });
    const ok = await m.deleteConversation(Number(req.params.id), req.user.id);
    if (!ok) return res.status(404).json({ success: false, message: "Conversation not found." });
    return res.json({ success: true });
  } catch (error) {
    console.error("WORK DELETE ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to delete conversation." });
  }
});

module.exports = router;
