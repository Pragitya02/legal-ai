const path = require("path");
const { PDFParse } = require("pdf-parse");
const mammoth = require("mammoth");
const Groq = require("groq-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");

/*
|--------------------------------------------------------------------------
| OPTIONAL LOCAL OCR
|--------------------------------------------------------------------------
|
| Tesseract.js is used as a final OCR fallback for image files when the
| configured vision APIs are unavailable. Install it with:
|
|   npm install tesseract.js
|
| The require is intentionally optional so the service does not crash on
| deployments where Tesseract has not been installed yet.
|
*/
let Tesseract = null;

try {
  Tesseract = require("tesseract.js");
} catch (error) {
  console.warn(
    "TESSERACT.JS NOT INSTALLED - local OCR fallback is unavailable."
  );
}

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
| LOCAL PDF PAGE RENDERING
|--------------------------------------------------------------------------
|
| pdf-img-convert renders scanned PDF pages into PNG buffers so Tesseract.js
| can OCR them without a separately hosted OCR API. Rendering is capped by
| OCR_MAX_PDF_PAGES to keep memory and processing time under control.
*/
let pdfToImages = null;
try {
  pdfToImages = require("pdf-img-convert");
} catch (error) {
  console.warn("PDF IMAGE CONVERTER NOT INSTALLED - scanned PDFs will use Gemini fallback.");
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
          process.env.GROQ_VISION_MODEL ||
          "qwen/qwen3.6-27b",

        messages: [
          {
            role: "user",

            content: [
              {
                type: "text",

                text: `
You are Nyaya AI's legal-document OCR and visual inspection assistant.

Carefully inspect the uploaded legal document image.

FIRST:
Perform OCR and transcribe as much readable text as possible.
Preserve names, numbers, dates, section numbers, case numbers,
addresses, headings, and paragraph content accurately.

SECOND:
Analyze the legal-document structure.

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

Return:

=== OCR EXTRACTED TEXT ===
[all readable text]

=== LEGAL DOCUMENT ANALYSIS ===
[structured analysis]

=== UNCLEAR / NOT READABLE ===
[list only things that cannot be read]

STRICT ACCURACY RULES:

- Never invent text.
- Never guess a number.
- Never guess a name.
- Never guess a date.
- Never infer a legal section that is not visible.
- Never claim a signature is genuine.
- Never claim a stamp or seal is authentic.
- Report a signature only if it is visibly present.
- Report a stamp/seal only if visibly present.
- If text is partially readable, preserve the readable portion and mark
  the uncertain portion as NOT CLEAR.
- If a field is not visible, say NOT VISIBLE IN THIS IMAGE.
- Do not claim that this document was checked against a government,
  police, court, Bar Council, or other external database.
- Do not fabricate case facts.

This output will be stored and supplied to the legal research assistant
for follow-up questions.
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
      completion?.choices?.[0]?.message?.content || ""
    );
  } catch (error) {
    console.error(
      "GROQ IMAGE OCR/ANALYSIS ERROR:",
      error?.message || error
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

  /*
  |--------------------------------------------------------------------------
  | MODEL SELECTION
  |--------------------------------------------------------------------------
  |
  | GEMINI_VISION_MODEL can be configured on Render. The default is a
  | multimodal Gemini model.
  |
  */

  // Prefer the currently documented stable multimodal model, then fall back
  // to other supported Flash models if the selected model is temporarily
  // unavailable or not enabled for this API key. Keep this list small to limit
  // extra API calls and avoid repeatedly trying retired model IDs.
  const modelsToTry = [
    process.env.GEMINI_VISION_MODEL,
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.5-flash-lite",
  ].filter(
    (value, index, array) => value && array.indexOf(value) === index
  );

  const prompt = `
You are Nyaya AI's legal document OCR and visual analysis engine.

The uploaded file is a legal document, case file, FIR, court order,
judgment, notice, petition, application, affidavit, evidence document,
or another legal record.

Your FIRST priority is OCR / text extraction.

Read the entire uploaded document carefully and extract ALL text that
is actually readable.

Preserve:
- exact names
- exact case numbers
- exact FIR numbers
- exact dates
- exact section numbers
- exact act names
- exact court names
- exact police-station names
- headings
- addresses
- paragraph text
- order numbers
- page numbers
- visible handwritten text

Then perform document analysis.

Return exactly these sections:

=== OCR EXTRACTED TEXT ===

[transcribe all readable text from the document]

=== DOCUMENT ANALYSIS ===

Document Type:
Court / Authority:
Case Number:
FIR Number:
Police Station:
Parties:
Advocates:
Important Dates:
Legal Sections:
Acts / Provisions:
Important Facts:
Orders / Directions:
Page Numbers:
Letterhead:
Signatures:
Stamps:
Seals:
Handwritten Content:
Other Important Elements:

=== UNCLEAR / MISSING INFORMATION ===

[list information that is not readable or not visible]

STRICT ACCURACY RULES:

1. Never invent information.
2. Never guess names.
3. Never guess numbers.
4. Never guess dates.
5. Never infer legal sections.
6. Never fill missing fields from general legal knowledge.
7. If text is unreadable, write NOT CLEAR.
8. If a field is not visible, write NOT VISIBLE IN THIS FILE.
9. A visible signature may only be reported as a visible signature.
10. A visible stamp may only be reported as a visible stamp.
11. A visible seal may only be reported as a visible seal.
12. Do not claim a signature, stamp, or seal is genuine or authentic.
13. Do not claim that any authority has verified the document.
14. Do not claim that you checked a live court, police, government,
    Bar Council, DigiLocker, or other external database.
15. Preserve exact text whenever readable.
16. Do not silently correct spelling, names, dates, or case numbers.
17. If the document contains multiple pages, inspect all pages supplied
    to the model.
18. Do not summarize instead of doing OCR. OCR comes first.

The extracted text will be used by an advocate-facing legal research
assistant. It must therefore remain faithful to the uploaded document.
`;

  for (const modelName of modelsToTry) {
    try {
      console.log(
        `GEMINI DOCUMENT VISION: trying model ${modelName}`
      );

      const model =
        gemini.getGenerativeModel({
          model: modelName,
        });

      const result =
        await model.generateContent([
          {
            inlineData: {
              data: buffer.toString("base64"),
              mimeType,
            },
          },
          prompt,
        ]);

      const text =
        result?.response?.text?.() || "";

      const cleaned = trimText(text);

      if (cleaned) {
        console.log(
          `GEMINI DOCUMENT VISION: successful with ${modelName}`
        );

        return cleaned;
      }

      console.warn(
        `GEMINI DOCUMENT VISION: ${modelName} returned empty output.`
      );
    } catch (error) {
      console.error(
        `GEMINI DOCUMENT VISION ERROR (${modelName}):`,
        error?.message || error
      );
    }
  }

  return "";
}

/*
|--------------------------------------------------------------------------
| TESSERACT OCR
|--------------------------------------------------------------------------
|
| Local OCR extracts text without an OCR API charge. Gemini remains the
| reasoning model used downstream by the research assistant. OCR is not
| proof that names, numbers, or legal citations were read correctly.
*/
async function recognizeImagesWithTesseract(imageBuffers, label = "image") {
  if (!Tesseract || !Array.isArray(imageBuffers) || imageBuffers.length === 0) return "";

  let worker;
  const language = String(process.env.OCR_LANGUAGE || "eng").trim() || "eng";
  try {
    // Let the installed tesseract.js package select its matching worker and
    // core. Overriding workerPath/corePath independently can pair incompatible
    // versions (the mismatch observed in Render logs). Only override the
    // language-data location, which is independent of the worker/core version.
    const workerOptions = {
      langPath: process.env.TESSERACT_LANG_PATH || "https://tessdata.projectnaptha.com/4.0.0",
    };
    worker = await Tesseract.createWorker(language, 1, workerOptions);
    const sections = [];
    for (let i = 0; i < imageBuffers.length; i += 1) {
      const result = await worker.recognize(imageBuffers[i]);
      const pageText = trimText(result?.data?.text || "");
      if (pageText) sections.push(`--- ${label.toUpperCase()} ${i + 1} ---\n${pageText}`);
    }
    return trimText(sections.join("\n\n"));
  } catch (error) {
    console.error("LOCAL TESSERACT OCR ERROR:", error?.message || error);
    return "";
  } finally {
    if (worker) {
      try { await worker.terminate(); } catch (_) {}
    }
  }
}

async function extractImageWithTesseract(buffer) {
  if (!buffer || !buffer.length) return "";
  const extracted = await recognizeImagesWithTesseract([buffer], "image page");
  if (!extracted) return "";
  console.log(`TESSERACT OCR: extracted ${extracted.length} characters from image.`);
  return `=== TEXT EXTRACTED BY LOCAL TESSERACT OCR ===\n\n${extracted}\n\n=== OCR LIMITATION ===\nText extraction can contain errors. Check names, dates, case numbers, section numbers, and quotations against the original page. OCR does not verify signatures, seals, authenticity, or legal correctness.`;
}

async function extractPdfWithTesseract(buffer) {
  if (!pdfToImages || !Tesseract || !buffer || !buffer.length) return "";
  const configuredLimit = Number.parseInt(process.env.OCR_MAX_PDF_PAGES || "10", 10);
  const maxPages = Math.min(25, Math.max(1, Number.isFinite(configuredLimit) ? configuredLimit : 10));
  const scale = Math.min(2.5, Math.max(1, Number(process.env.OCR_PDF_SCALE) || 1.5));
  try {
    console.log(`TESSERACT OCR: rendering up to ${maxPages} scanned PDF pages...`);
    const pageNumbers = Array.from({ length: maxPages }, (_, i) => i + 1);
    const renderedPages = await pdfToImages.convert(buffer, {
      page_numbers: pageNumbers,
      scale,
    });
    if (!Array.isArray(renderedPages) || renderedPages.length === 0) return "";
    const extracted = await recognizeImagesWithTesseract(renderedPages, "page");
    if (!extracted) return "";
    console.log(`TESSERACT OCR: extracted ${extracted.length} characters from ${renderedPages.length} PDF page(s).`);
    return `=== TEXT EXTRACTED BY LOCAL TESSERACT OCR ===\n\n${extracted}\n\n=== OCR LIMITATION ===\nOCR may misread names, dates, case numbers, section numbers, or legal quotations. Verify them against the original PDF. ${renderedPages.length === maxPages ? `At most ${maxPages} page(s) were processed; if the PDF has more pages, later pages may not be included.` : ""} OCR does not verify signatures, seals, authenticity, or legal correctness.`;
  } catch (error) {
    console.error("SCANNED PDF TESSERACT OCR ERROR:", error?.message || error);
    return "";
  }
}

/*
|--------------------------------------------------------------------------
| PDF ANALYSIS
|--------------------------------------------------------------------------
|
| Text-based PDFs use their embedded text (no OCR cost). Scanned PDFs use
| local Tesseract OCR; Gemini is the downstream reasoning model. If local
| OCR cannot run or returns no text, Gemini can inspect the original PDF.
*/
async function extractPdfDocument(buffer) {
  let textExtraction = "";
  try {
    textExtraction = await extractPdfText(buffer);
  } catch (error) {
    console.error("PDF TEXT EXTRACTION ERROR:", error?.message || error);
  }

  if (textExtraction.length >= 180) {
    return trimText(`=== TEXT EXTRACTED DIRECTLY FROM PDF ===\n\n${textExtraction}`);
  }

  const tesseractText = await extractPdfWithTesseract(buffer);
  if (tesseractText) return tesseractText;

  // Fallback only when local OCR is unavailable or produces no readable text.
  if (gemini) {
    const visualText = await extractWithGeminiVision(buffer, "application/pdf");
    if (visualText) return visualText;
  }
  // Do not send application/pdf to Groq's image_url field. That field expects
  // a supported image data URL; PDF buffers are not valid image payloads.
  // If local OCR and Gemini PDF understanding both fail, return the explicit
  // extraction warning below rather than generating a misleading 400 error.
  if (textExtraction) return textExtraction;

  return `\n[NO READABLE TEXT FOUND]\n\nNo embedded PDF text or local OCR text could be extracted. If this is a scanned PDF, check the OCR dependencies and try a clearer scan. Do not assume information is absent from the original document.`;
}

/*
|--------------------------------------------------------------------------
| IMAGE ANALYSIS
|--------------------------------------------------------------------------
*/
async function extractImageDocument(buffer, mimeType) {
  // Prefer local OCR to avoid spending Gemini vision tokens on simple text extraction.
  const tesseractText = await extractImageWithTesseract(buffer);
  if (tesseractText) return tesseractText;

  // If OCR fails, use Gemini vision as a fallback; downstream Gemini reasoning
  // still analyzes extracted text during the research workflow.
  if (gemini) {
    const geminiText = await extractWithGeminiVision(buffer, mimeType);
    if (geminiText) return geminiText;
  }
  if (groq) {
    const groqText = await extractImageWithGroq(buffer, mimeType);
    if (groqText) return groqText;
  }

  return `\n[IMAGE UPLOADED]\n\nThe image was uploaded, but local OCR did not return readable text and no vision fallback succeeded. Try a clearer scan. Do not assume that information is absent from the original document.`;
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
  extractPdfText,
  extractDocx,
  extractWithGeminiVision,
  extractImageWithGroq,
  extractImageWithTesseract,
  extractPdfWithTesseract,
};