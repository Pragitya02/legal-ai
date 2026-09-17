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

  const modelsToTry = [
    process.env.GEMINI_VISION_MODEL || "gemini-3-flash",
    "gemini-3-flash",
  ].filter(
    (value, index, array) =>
      value && array.indexOf(value) === index
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
| LOCAL TESSERACT OCR FALLBACK
|--------------------------------------------------------------------------
|
| This path is deliberately used only after Gemini and Groq vision fail.
| It is useful for photographed/scanned case documents where the image
| contains readable text but no cloud vision model is configured.
|
*/

async function extractImageWithTesseract(
  buffer
) {
  if (!Tesseract) {
    return "";
  }

  if (!buffer || !buffer.length) {
    return "";
  }

  try {
    console.log(
      "LOCAL OCR: starting Tesseract OCR..."
    );

    const result =
      await Tesseract.recognize(
        buffer,
        process.env.OCR_LANGUAGE || "eng",
        {
          logger: (info) => {
            if (
              info?.status === "recognizing text" &&
              typeof info.progress === "number"
            ) {
              const percent =
                Math.round(info.progress * 100);

              if (percent % 20 === 0) {
                console.log(
                  `LOCAL OCR: ${percent}%`
                );
              }
            }
          },
        }
      );

    const extracted =
      trimText(
        result?.data?.text || ""
      );

    if (extracted) {
      console.log(
        "LOCAL OCR: text extraction completed."
      );

      return `
=== OCR EXTRACTED TEXT ===

${extracted}

=== OCR NOTE ===

Text was extracted using local OCR. Visual legal elements such as
signatures, stamps, seals, and document authenticity were not
independently verified.
`;
    }

    console.warn(
      "LOCAL OCR: no readable text found."
    );

    return "";
  } catch (error) {
    console.error(
      "LOCAL TESSERACT OCR ERROR:",
      error?.message || error
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
  | GROQ PDF VISION FALLBACK
  |--------------------------------------------------------------------------
  |
  | Some Groq vision deployments may accept document/PDF input while
  | others may not. We therefore attempt it only after Gemini and keep
  | normal PDF text extraction as the primary path.
  |
  */

  if (!visualExtraction && groq) {
    try {
      visualExtraction =
        await extractImageWithGroq(
          buffer,
          "application/pdf"
        );
    } catch (error) {
      console.error(
        "GROQ PDF ANALYSIS ERROR:",
        error?.message || error
      );
    }
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

No machine-readable text could be extracted from this PDF.

The PDF may be a scanned/image-only document. A configured
vision/OCR provider was either unavailable or could not analyze it.

Do not assume that information is absent from the original document.
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
  | STEP 1 — GEMINI VISION
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
  | STEP 2 — GROQ VISION
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
  | STEP 3 — LOCAL OCR
  |--------------------------------------------------------------------------
  |
  | This allows an image containing ordinary printed text to still be
  | extracted even when the cloud vision services are unavailable.
  |
  */

  const ocrText =
    await extractImageWithTesseract(
      buffer
    );

  if (ocrText) {
    return ocrText;
  }

  /*
  |--------------------------------------------------------------------------
  | NO EXTRACTION ENGINE AVAILABLE
  |--------------------------------------------------------------------------
  */

  const configuredProviders = [];

  if (gemini) {
    configuredProviders.push("Gemini");
  }

  if (groq) {
    configuredProviders.push("Groq");
  }

  if (Tesseract) {
    configuredProviders.push("Tesseract OCR");
  }

  return `
[IMAGE UPLOADED]

The image was uploaded successfully, but OCR/text extraction could not
be completed.

Configured extraction providers:
${
  configuredProviders.length
    ? configuredProviders.join(", ")
    : "None"
}

The original document may still contain readable information.
Do not assume that a field is absent merely because extraction failed.

To enable image OCR on the server, configure GEMINI_API_KEY or
GROQ_API_KEY. For a local OCR fallback, install tesseract.js.
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
  extractPdfText,
  extractDocx,
  extractWithGeminiVision,
  extractImageWithGroq,
  extractImageWithTesseract,
};