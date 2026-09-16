const path = require("path");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");
const Groq = require("groq-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");

/*
|--------------------------------------------------------------------------
| AI CLIENTS
|--------------------------------------------------------------------------
*/

const groq = process.env.GROQ_API_KEY
  ? new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  : null;

const gemini = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

/*
|--------------------------------------------------------------------------
| LIMITS
|--------------------------------------------------------------------------
|
| Keep the extracted document reasonably sized before storing it in the
| research database and passing it to the research agent.
|
*/

const MAX_EXTRACTED_CHARS = 90000;

/*
|--------------------------------------------------------------------------
| TEXT CLEANING
|--------------------------------------------------------------------------
*/

function trimText(text) {
  return String(text || "")
    .replace(/\u0000/g, "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_EXTRACTED_CHARS);
}

/*
|--------------------------------------------------------------------------
| PDF TEXT EXTRACTION
|--------------------------------------------------------------------------
|
| Works well for normal text-based PDFs.
|
| For scanned/image PDFs, the visual AI path below is also attempted.
|
*/

async function extractPdfText(buffer) {
  if (!buffer || !buffer.length) {
    throw new Error("PDF file is empty.");
  }

  const parser = new PDFParse({
    data: buffer,
  });

  try {
    const result = await parser.getText();

    return trimText(
      result?.text || result || ""
    );
  } finally {
    if (
      parser &&
      typeof parser.destroy === "function"
    ) {
      await parser.destroy();
    }
  }
}

/*
|--------------------------------------------------------------------------
| DOCX TEXT EXTRACTION
|--------------------------------------------------------------------------
|
| Mammoth extracts the readable text from Word documents.
|
*/

async function extractDocx(buffer) {
  if (!buffer || !buffer.length) {
    throw new Error("DOCX file is empty.");
  }

  const result =
    await mammoth.extractRawText({
      buffer,
    });

  return trimText(
    result?.value || ""
  );
}

/*
|--------------------------------------------------------------------------
| GROQ VISION EXTRACTION
|--------------------------------------------------------------------------
|
| Used as a fallback for image documents when Gemini Vision is not
| configured or fails.
|
*/

async function extractImageWithGroq(
  buffer,
  mimeType
) {
  if (!groq) {
    return "";
  }

  if (!buffer || !buffer.length) {
    return "";
  }

  try {
    const dataUrl =
      `data:${mimeType};base64,` +
      buffer.toString("base64");

    const completion =
      await groq.chat.completions.create({
        model:
          "meta-llama/llama-4-scout-17b-16e-instruct",

        messages: [
          {
            role: "user",

            content: [
              {
                type: "text",

                text: `
You are Nyaya AI's legal-document OCR and visual inspection assistant.

Carefully inspect the uploaded legal document image.

Extract only information that is actually visible and readable.

Look for:

1. Document type
2. Court or authority
3. Case number
4. FIR number
5. Police station
6. Names of parties
7. Advocate names
8. Dates
9. Legal sections
10. Acts and provisions
11. Orders and directions
12. Page numbers
13. Letterhead
14. Signatures
15. Stamps
16. Seals
17. Handwritten marks
18. Important missing or unclear information

IMPORTANT ACCURACY RULES:

- Never invent text.
- Never guess a number.
- Never guess a name.
- Never guess a date.
- Never assume a signature exists.
- Never assume a stamp or seal exists.
- Only report a signature, stamp, or seal when it is actually visible.
- If something is present but unreadable, say NOT CLEAR.
- If something cannot be verified from the image, say NOT VERIFIABLE FROM THIS FILE.
- Do not claim that this document was checked against a government, police, court, Bar Council, or other external database.
- Preserve exact numbers and names whenever they are readable.

Return a structured plain-text extraction that can later be used by a legal research AI.
`,
              },

              {
                type: "image_url",

                image_url: {
                  url: dataUrl,
                },
              },
            ],
          },
        ],

        temperature: 0,
      });

    return trimText(
      completion?.choices?.[0]?.message
        ?.content || ""
    );
  } catch (error) {
    console.error(
      "GROQ IMAGE ANALYSIS ERROR:",
      error.message
    );

    return "";
  }
}

/*
|--------------------------------------------------------------------------
| GEMINI VISION EXTRACTION
|--------------------------------------------------------------------------
|
| Gemini is used for visual document understanding.
|
| This is particularly important for:
| - scanned documents
| - signatures
| - stamps
| - seals
| - handwritten marks
| - page-level visual information
|
*/

async function extractWithGeminiVision(
  buffer,
  mimeType
) {
  if (!gemini) {
    return "";
  }

  if (!buffer || !buffer.length) {
    return "";
  }

  try {
    const model =
      gemini.getGenerativeModel({
        model: "gemini-2.5-flash",
      });

    const result =
      await model.generateContent([
        {
          inlineData: {
            data:
              buffer.toString("base64"),

            mimeType,
          },
        },

        `
You are Nyaya AI's legal document extraction and verification engine.

Carefully inspect the uploaded legal document.

Your job is to extract information that is actually present in the file.

Analyze both readable text and visible document structure.

Return a structured plain-text report containing:

1. DOCUMENT TYPE
2. COURT / AUTHORITY
3. CASE NUMBER
4. FIR NUMBER
5. POLICE STATION
6. PARTIES / NAMES
7. ADVOCATES
8. IMPORTANT DATES
9. LEGAL SECTIONS
10. ACTS / PROVISIONS
11. IMPORTANT FACTS
12. ORDERS / DIRECTIONS
13. PAGE NUMBERS
14. LETTERHEAD
15. SIGNATURES
16. STAMPS
17. SEALS
18. HANDWRITTEN CONTENT
19. OTHER IMPORTANT DOCUMENT ELEMENTS
20. MISSING OR UNCLEAR INFORMATION

STRICT ACCURACY RULES:

- Read the document carefully before answering.
- Do not invent information.
- Do not guess missing information.
- Do not infer a case number from unrelated numbers.
- Do not infer a person's name.
- Do not infer dates.
- Do not infer legal sections.
- Do not claim a signature is genuine.
- Do not claim a stamp or seal is authentic.
- A visible signature may only be reported as a visible signature.
- A visible stamp may only be reported as a visible stamp.
- A visible seal may only be reported as a visible seal.
- Do not claim that a signature, stamp, or seal belongs to a particular authority unless the document actually identifies it.
- If text is unreadable, write NOT CLEAR.
- If something cannot be visually verified from this file, write NOT VERIFIABLE FROM THIS FILE.
- Do not claim to have checked a live court database, government database, police database, Bar Council database, or any other external source.
- Preserve exact names, numbers, dates, and sections whenever they are readable.

This extraction will be stored and later used by an advocate-facing legal research assistant.

The assistant must be able to answer follow-up questions such as:

"Does the document contain a case number?"

"Which sections are mentioned?"

"What is the date of the order?"

"Is there a signature?"

"Is there a court seal?"

"Which page contains the case number?"

"What information is missing?"

Only answer those questions from information actually available in this document.
`,
      ]);

    const text =
      result?.response?.text?.() || "";

    return trimText(text);
  } catch (error) {
    console.error(
      "GEMINI DOCUMENT ANALYSIS ERROR:",
      error.message
    );

    return "";
  }
}

/*
|--------------------------------------------------------------------------
| PDF ANALYSIS
|--------------------------------------------------------------------------
|
| First extract normal PDF text.
|
| Then send the original PDF to Gemini Vision when available so that
| visual elements can also be inspected.
|
*/

async function extractPdfDocument(
  buffer
) {
  let textExtraction = "";

  /*
  |--------------------------------------------------------------------------
  | STEP 1 — NORMAL PDF TEXT
  |--------------------------------------------------------------------------
  */

  try {
    textExtraction =
      await extractPdfText(buffer);
  } catch (error) {
    console.error(
      "PDF TEXT EXTRACTION ERROR:",
      error.message
    );
  }

  /*
  |--------------------------------------------------------------------------
  | STEP 2 — VISUAL PDF ANALYSIS
  |--------------------------------------------------------------------------
  |
  | This allows scanned PDFs and visual elements to be analyzed when
  | Gemini is configured.
  |
  */

  let visualExtraction = "";

  if (gemini) {
    visualExtraction =
      await extractWithGeminiVision(
        buffer,
        "application/pdf"
      );
  }

  /*
  |--------------------------------------------------------------------------
  | COMBINE RESULTS
  |--------------------------------------------------------------------------
  */

  if (
    textExtraction &&
    visualExtraction
  ) {
    return trimText(`
--- TEXT EXTRACTION ---

${textExtraction}

--- VISUAL DOCUMENT ANALYSIS ---

${visualExtraction}
`);
  }

  if (visualExtraction) {
    return visualExtraction;
  }

  if (textExtraction) {
    return textExtraction;
  }

  /*
  |--------------------------------------------------------------------------
  | NOTHING READABLE
  |--------------------------------------------------------------------------
  */

  return `
[NO READABLE TEXT FOUND]

The PDF could not be read as normal text.

Visual verification could not be completed because
a configured document-vision model was not available
or could not analyze the document.

Do not assume that missing information is absent from
the original document.
`;
}

/*
|--------------------------------------------------------------------------
| IMAGE ANALYSIS
|--------------------------------------------------------------------------
*/

async function extractImageDocument(
  buffer,
  mimeType
) {
  /*
  |--------------------------------------------------------------------------
  | PRIMARY — GEMINI
  |--------------------------------------------------------------------------
  */

  if (gemini) {
    const geminiText =
      await extractWithGeminiVision(
        buffer,
        mimeType
      );

    if (geminiText) {
      return geminiText;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | FALLBACK — GROQ VISION
  |--------------------------------------------------------------------------
  */

  if (groq) {
    const groqText =
      await extractImageWithGroq(
        buffer,
        mimeType
      );

    if (groqText) {
      return groqText;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | NO VISION MODEL
  |--------------------------------------------------------------------------
  */

  return `
[IMAGE UPLOADED]

The image was uploaded successfully, but its text
and visual elements could not be analyzed because
no configured vision model is available.

Do not assume that information is missing from the
original document merely because it could not be read.
`;
}

/*
|--------------------------------------------------------------------------
| MAIN DOCUMENT EXTRACTION FUNCTION
|--------------------------------------------------------------------------
|
| This is the function imported by researchRoutes.js:
|
| const { extractDocument } =
|   require("../services/researchDocumentService");
|
*/

async function extractDocument(
  buffer,
  fileName,
  mimeType
) {
  if (!buffer || !buffer.length) {
    throw new Error(
      "The uploaded document is empty."
    );
  }

  const safeFileName =
    String(fileName || "").trim();

  const safeMimeType =
    String(mimeType || "")
      .trim()
      .toLowerCase();

  const extension =
    path
      .extname(safeFileName)
      .toLowerCase();

  /*
  |--------------------------------------------------------------------------
  | PDF
  |--------------------------------------------------------------------------
  */

  if (
    safeMimeType ===
      "application/pdf" ||
    extension === ".pdf"
  ) {
    return extractPdfDocument(
      buffer
    );
  }

  /*
  |--------------------------------------------------------------------------
  | DOCX
  |--------------------------------------------------------------------------
  */

  if (
    safeMimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === ".docx"
  ) {
    const text =
      await extractDocx(buffer);

    if (text) {
      return text;
    }

    return `
[DOCX DOCUMENT]

The Word document was received, but no readable
text could be extracted from it.

Do not assume that information is absent from the
original document.
`;
  }

  /*
  |--------------------------------------------------------------------------
  | IMAGES
  |--------------------------------------------------------------------------
  */

  if (
    safeMimeType.startsWith(
      "image/"
    ) ||
    [
      ".png",
      ".jpg",
      ".jpeg",
      ".webp",
      ".gif",
    ].includes(extension)
  ) {
    return extractImageDocument(
      buffer,
      safeMimeType ||
        "image/jpeg"
    );
  }

  /*
  |--------------------------------------------------------------------------
  | UNSUPPORTED FORMAT
  |--------------------------------------------------------------------------
  */

  throw new Error(
    "Unsupported research document type. Use PDF, DOCX, PNG, JPG, JPEG, WEBP or GIF."
  );
}

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {
  extractDocument,
};