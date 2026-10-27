const askAI = require("../services/groqService");

const {
  retrieveRelevantLaws,
  extractSectionNumber,
  detectAct,
} = require("../services/legalRetrievalService");

const {
  webResearchAgent,
} = require("./webResearchAgent");

const {
  CITATION_PROMPT_RULES,
  buildStatuteCitations,
  buildWebCitations,
  buildCitationIndex,
  finalizeAnswer,
} = require("../services/citationService");

/*
|--------------------------------------------------------------------------
| NYAYA AI — ADVOCATE RESEARCH CHAT AGENT
|--------------------------------------------------------------------------
|
| Responsibilities:
|
| 1. Answer legal research questions.
| 2. Understand uploaded case/document context.
| 3. Maintain conversational follow-ups.
| 4. Use the shared Legal RAG for statutory research.
| 5. Use TinyFish for live web research when appropriate.
| 6. Never invent document facts.
| 7. Clearly distinguish document facts from legal knowledge.
| 8. Clearly distinguish live web research from Legal RAG.
| 9. Refuse questions unrelated to legal/case research.
|
|--------------------------------------------------------------------------
*/

const OUT_OF_SCOPE_RESPONSE =
  "This question is not relevant to the current case. I can help you with questions related to your uploaded documents, case, or legal research.";

/*
|--------------------------------------------------------------------------
| TEXT HELPERS
|--------------------------------------------------------------------------
*/

function cleanText(value, maxLength = 12000) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, maxLength);
}

/*
|--------------------------------------------------------------------------
| ROLE NORMALIZATION
|--------------------------------------------------------------------------
*/

function normalizeRole(role) {
  const value = String(role || "").toLowerCase();

  if (
    value === "user" ||
    value === "human"
  ) {
    return "user";
  }

  if (
    value === "assistant" ||
    value === "ai" ||
    value === "system"
  ) {
    return "assistant";
  }

  return "user";
}

/*
|--------------------------------------------------------------------------
| HISTORY FORMATTER
|--------------------------------------------------------------------------
*/

function formatHistory(history) {
  if (
    !Array.isArray(history) ||
    history.length === 0
  ) {
    return "No previous conversation is available.";
  }

  return history
    .slice(-3)
    .map((item) => {
      const role = normalizeRole(
        item?.role ||
          item?.sender ||
          item?.message_role
      );

      const content = cleanText(
        item?.content ||
          item?.message ||
          item?.text ||
          "",
        500
      );

      if (!content) {
        return "";
      }

      return (
        `${role === "user" ? "ADVOCATE" : "NYAYA AI"}: ` +
        content
      );
    })
    .filter(Boolean)
    .join("\n\n");
}

/*
|--------------------------------------------------------------------------
| DOCUMENT FORMATTER
|--------------------------------------------------------------------------
*/

function formatDocuments(documents) {
  if (
    !Array.isArray(documents) ||
    documents.length === 0
  ) {
    return "No document has been uploaded in this research session.";
  }

  // Keep uploaded-document context modest so Groq TPM limits are not exceeded.
  const MAX_DOCUMENTS = 2;
  const MAX_TEXT_PER_DOCUMENT = 1800;
  const MAX_TOTAL_DOCUMENT_CHARS = 3500;

  let totalChars = 0;
  const formattedDocuments = [];

  for (
    let index = 0;
    index < Math.min(
      documents.length,
      MAX_DOCUMENTS
    );
    index++
  ) {
    const document = documents[index];

    const name = cleanText(
      document?.file_name ||
        document?.filename ||
        `Document ${index + 1}`,
      300
    );

    const type = cleanText(
      document?.file_type ||
        document?.mime_type ||
        "Unknown",
      200
    );

    let extractedText = cleanText(
      document?.extracted_text ||
        document?.extractedText ||
        document?.content ||
        document?.text ||
        "",
      MAX_TEXT_PER_DOCUMENT
    );

    if (
      extractedText.length >=
      MAX_TEXT_PER_DOCUMENT
    ) {
      extractedText +=
        "\n[Document text truncated for context-size safety.]";
    }

    const documentBlock = `
DOCUMENT ${index + 1}

File name:

${name}

File type:

${type}

EXTRACTED / ANALYZED CONTENT:

${extractedText || "[No readable content available]"}
`;

    if (
      totalChars +
        documentBlock.length >
      MAX_TOTAL_DOCUMENT_CHARS
    ) {
      break;
    }

    formattedDocuments.push(
      documentBlock
    );

    totalChars += documentBlock.length;
  }

  if (
    formattedDocuments.length === 0
  ) {
    return "No readable document context is available.";
  }

  return formattedDocuments.join(
    "\n\n----------------------------------------\n\n"
  );
}

/*
|--------------------------------------------------------------------------
| SIMPLE OUT-OF-SCOPE DETECTION
|--------------------------------------------------------------------------
*/

function looksObviouslyOutOfScope(message) {
  const text = String(message || "")
    .trim()
    .toLowerCase();

  if (!text) {
    return true;
  }

  const obviousPatterns = [
    /^how are you\b/,
    /^how r u\b/,
    /^what are you doing\b/,
    /^who are you\b/,

    /^tell me a joke\b/,
    /^make me laugh\b/,

    /^good morning\b/,
    /^good afternoon\b/,
    /^good evening\b/,
    /^good night\b/,

    /^what should i eat\b/,
    /^what should we eat\b/,
    /^recipe\b/,

    /^write code\b/,
    /^generate code\b/,

    /^javascript\b/,
    /^python\b/,
    /^html\b/,
    /^css\b/,
    /^react\b/,
    /^node\.?js\b/,

    /^gaming\b/,
    /^movie recommendation\b/,
    /^song recommendation\b/,

    /^football\b/,
    /^cricket score\b/,
    /^weather\b/,
  ];

  return obviousPatterns.some(
    (pattern) => pattern.test(text)
  );
}

/*
|--------------------------------------------------------------------------
| DOCUMENT CONTEXT DETECTION
|--------------------------------------------------------------------------
*/

function hasDocuments(documents) {
  return (
    Array.isArray(documents) &&
    documents.length > 0
  );
}

/*
|--------------------------------------------------------------------------
| LEGAL RAG DETECTION
|--------------------------------------------------------------------------
*/

function shouldUseLegalRAG(message) {
  const text = String(message || "")
    .toLowerCase()
    .trim();

  if (!text) {
    return false;
  }

  const explicitSection =
    extractSectionNumber(text);

  const explicitAct =
    detectAct(text);

  if (
    explicitSection &&
    explicitAct
  ) {
    return true;
  }

  const legalPatterns = [
    /\bsection\b/,
    /\bsections\b/,

    /\barticle\b/,
    /\barticles\b/,

    /\bact\b/,
    /\bacts\b/,

    /\bbns\b/,
    /\bbnss\b/,
    /\bbsa\b/,

    /\bipc\b/,
    /\bcrpc\b/,
    /\bcpc\b/,

    /\bevidence\b/,
    /\bevidentiary\b/,
    /\badmissib/,

    /\bbail\b/,
    /\banticipatory bail\b/,
    /\bregular bail\b/,

    /\bfir\b/,
    /\barrest\b/,
    /\bcustody\b/,

    /\bpunishment\b/,
    /\bpenalty\b/,
    /\boffence\b/,
    /\boffense\b/,

    /\bprosecution\b/,
    /\bconviction\b/,
    /\bacquittal\b/,

    /\bappeal\b/,
    /\brevision\b/,
    /\bquashing\b/,
    /\blimitation\b/,
    /\bjurisdiction\b/,

    /\bdefamation\b/,
    /\btheft\b/,
    /\bmurder\b/,
    /\bcheating\b/,
    /\bfraud\b/,
    /\bassault\b/,

    /\bcontract\b/,
    /\bproperty\b/,
    /\bconstitutional\b/,

    /\blegal provision\b/,
    /\blegal provisions\b/,
    /\blegal remedy\b/,
    /\blegal remedies\b/,

    /\bstatutory\b/,
    /\bstatute\b/,
    /\blegislation\b/,

    /\bwhat does .* law\b/,
    /\bunder indian law\b/,
    /\bunder .* act\b/,

    /\bwhich section\b/,
    /\bwhich act\b/,

    /\bapplicable law\b/,
    /\bapplicable section\b/,
  ];

  return legalPatterns.some(
    (pattern) => pattern.test(text)
  );
}

/*
|--------------------------------------------------------------------------
| TINYFISH / LIVE WEB RESEARCH DETECTION
|--------------------------------------------------------------------------
*/

function shouldUseWebResearch(
  message,
  researchMode = "standard"
) {
  if (researchMode === "deep") {
    return true;
  }

  const text = String(message || "")
    .toLowerCase()
    .trim();

  if (!text) {
    return false;
  }

  const webResearchPatterns = [
    /\brecent\b/,
    /\blatest\b/,
    /\bcurrent\b/,
    /\bcurrently\b/,
    /\bnewest\b/,
    /\bupdated\b/,
    /\brecently\b/,

    /\brecent judgment\b/,
    /\brecent judgments\b/,
    /\blatest judgment\b/,
    /\blatest judgments\b/,
    /\brelevant judgment\b/,
    /\brelevant judgments\b/,

    /\bsupreme court\b/,
    /\bhigh court\b/,
    /\bcourt judgment\b/,
    /\bcourt judgments\b/,

    /\bcase law\b/,
    /\bprecedent\b/,
    /\bprecedents\b/,

    /\bgovernment notification\b/,
    /\bofficial notification\b/,
    /\bamendment\b/,
    /\bamendments\b/,

    /\blegal update\b/,
    /\blegal updates\b/,
    /\bcurrent law\b/,

    /\bsearch online\b/,
    /\bsearch the web\b/,
    /\bonline research\b/,
    /\blive research\b/,
    /\bweb research\b/,
    /\bfind online\b/,
    /\blook online\b/,
  ];

  return webResearchPatterns.some(
    (pattern) => pattern.test(text)
  );
}

/*
|--------------------------------------------------------------------------
| LEGAL RAG CONTEXT FORMATTER
|--------------------------------------------------------------------------
*/

function formatLegalSources(laws, citations = []) {
  if (
    !Array.isArray(laws) ||
    laws.length === 0
  ) {
    return {
      text:
        "No legal provisions were retrieved from the " +
        "legal knowledge base.",
      includedCitations: [],
    };
  }

  // Citation IDs are keyed by the row's position in `laws`.
  const citationByLawIndex = new Map(
    citations.map((c) => [c.lawIndex, c])
  );

  const includedCitations = [];

  // Compact legal RAG context; the prompt contains substantial fixed instructions.
  const MAX_SOURCES = 3;
  const MAX_CONTENT_CHARS_PER_SOURCE = 1000;
  const MAX_TOTAL_LEGAL_CHARS = 2600;

  let totalChars = 0;
  const formattedSources = [];

  for (
    let index = 0;
    index < Math.min(
      laws.length,
      MAX_SOURCES
    );
    index++
  ) {
    const law = laws[index];

    const citation = citationByLawIndex.get(index);

    // Duplicate provisions were removed when citations were built.
    if (citations.length > 0 && !citation) {
      continue;
    }

    let content =
      typeof law?.content === "string"
        ? law.content
        : "";

    if (
      content.length >
      MAX_CONTENT_CHARS_PER_SOURCE
    ) {
      content =
        content.slice(
          0,
          MAX_CONTENT_CHARS_PER_SOURCE
        ) +
        "\n[Legal text truncated for context-size safety.]";
    }

    const source = `
LEGAL SOURCE ${index + 1}${
      citation
        ? `   (CITATION ID: [${citation.id}])`
        : ""
    }

Act:

${law?.act_name || "Not available"}

Act Number:

${law?.act_number || "Not available"}

Section:

${law?.section_number || "Not available"}

Section Title:

${law?.section_title || "Not available"}

Legal Text:

${content}

Source:

${law?.source_url ||
  law?.source_name ||
  "Not available"}

Effective Date:

${law?.effective_date ||
  "Not available"}

Retrieval Type:

${law?.retrieval_type ||
  law?.retrievalType ||
  "legal_corpus"}
`;

    if (
      totalChars +
        source.length >
      MAX_TOTAL_LEGAL_CHARS
    ) {
      break;
    }

    formattedSources.push(source);

    if (citation) {
      includedCitations.push(citation);
    }

    totalChars += source.length;
  }

  if (
    formattedSources.length === 0
  ) {
    return {
      text:
        "No legal provisions could be included within " +
        "the legal context budget.",
      includedCitations: [],
    };
  }

  return {
    text: formattedSources.join(
      "\n----------------------------------------\n"
    ),
    includedCitations,
  };
}

/*
|--------------------------------------------------------------------------
| TINYFISH RESULT FORMATTER
|--------------------------------------------------------------------------
*/

/*
 * Formats the ALREADY-NORMALISED web citations (see normalizeWebSources and
 * buildWebCitations). The model therefore sees exactly the sources the user
 * will see, each tagged with its citation ID.
 */
function formatWebResearch(webCitations) {
  if (!Array.isArray(webCitations)) {
    return "No live web research was performed.";
  }

  if (webCitations.length === 0) {
    return (
      "No relevant live web sources were retrieved."
    );
  }

  return webCitations
    .map((citation) => `
LIVE WEB SOURCE ${citation.id.slice(1)}   (CITATION ID: [${citation.id}])

Title:

${citation.title || "Not available"}

Source:

${citation.sourceName || "Not available"}

Snippet:

${citation.snippet || "No snippet available"}
`)
    .join(
      "\n----------------------------------------\n"
    );
}

/*
|--------------------------------------------------------------------------
| STEP 8 — NORMALIZE TINYFISH SOURCES
|--------------------------------------------------------------------------
|
| Actual TinyFish response observed in production:
|
| webResearch.results.results[]
|
| Each result contains:
|
| - position
| - site_name
| - snippet
| - title
| - url
|
| This creates a stable frontend-safe structure.
|
|--------------------------------------------------------------------------
*/

// Maximum number of web results shown to the model AND to the user.
const MAX_WEB_SOURCES = 3;

/*
 * TinyFish returns webResearch.results.results[]. Older/alternative shapes
 * are tolerated so a provider change cannot silently drop all sources.
 */
function extractRawWebResults(webResearch) {
  const raw = webResearch?.results;

  if (Array.isArray(raw)) {
    return raw;
  }

  if (raw && typeof raw === "object") {
    for (const key of ["results", "data", "items"]) {
      if (Array.isArray(raw[key])) {
        return raw[key];
      }
    }
  }

  return [];
}

function normalizeWebSources(webResearch) {
  return extractRawWebResults(webResearch)
    .map((result) => ({
      title: cleanText(
        result?.title ||
          result?.name ||
          "",
        500
      ),

      url: cleanText(
        result?.url ||
          result?.link ||
          "",
        1000
      ),

      site_name: cleanText(
        result?.site_name ||
          result?.source ||
          "",
        300
      ),

      snippet: cleanText(
        result?.snippet ||
          result?.description ||
          "",
        500
      ),

      position:
        Number.isFinite(
          result?.position
        )
          ? result.position
          : null,
    }))
    .filter(
      (source) => source.url
    )
    .slice(0, MAX_WEB_SOURCES);
}

/*
|--------------------------------------------------------------------------
| MAIN ADVOCATE RESEARCH AGENT
|--------------------------------------------------------------------------
*/

async function researchChatAgent({
  message,
  history = [],
  documents = [],
  researchMode = "standard",
}) {
  /*
  |--------------------------------------------------------------------------
  | STEP 1 — BASIC INPUT
  |--------------------------------------------------------------------------
  */

  const userMessage =
    cleanText(
      message,
      3000
    );

  if (!userMessage) {
    return OUT_OF_SCOPE_RESPONSE;
  }

  /*
  |--------------------------------------------------------------------------
  | STEP 2 — FAST OUT-OF-SCOPE FILTER
  |--------------------------------------------------------------------------
  */

  if (
    looksObviouslyOutOfScope(
      userMessage
    )
  ) {
    return OUT_OF_SCOPE_RESPONSE;
  }

  /*
  |--------------------------------------------------------------------------
  | STEP 3 — PREPARE EXISTING ADVOCATE CONTEXT
  |--------------------------------------------------------------------------
  */

  const conversationHistory =
    formatHistory(history);

  const documentContext =
    formatDocuments(documents);

  const documentAvailable =
    hasDocuments(documents);

  /*
  |--------------------------------------------------------------------------
  | STEP 4 — LEGAL RAG
  |--------------------------------------------------------------------------
  */

  let legalLaws = [];

  // Citations for the statute rows that were actually sent to the model.
  let statuteCitations = [];

  let legalContext =
    "Legal retrieval was not required for this question.";

  let explicitSection = null;

  let explicitAct = null;

  let explicitReferenceRequested =
    false;

  const useLegalRAG =
    shouldUseLegalRAG(
      userMessage
    );

  if (useLegalRAG) {
    explicitSection =
      extractSectionNumber(
        userMessage
      );

    explicitAct =
      detectAct(
        userMessage
      );

    explicitReferenceRequested =
      Boolean(
        explicitSection &&
        explicitAct
      );

    if (
      explicitReferenceRequested
    ) {
      console.log(
        "RESEARCH RAG: Explicit legal reference detected →",
        `${explicitAct.actName} Section ${explicitSection}`
      );
    }

    try {
      legalLaws =
        await retrieveRelevantLaws(
          userMessage,
          5
        );

      console.log(
        `RESEARCH RAG: Retrieved ${legalLaws.length} provision(s)`
      );

      legalLaws.forEach(
        (law, index) => {
          console.log(
            `RESEARCH RAG SOURCE ${index + 1}:`,
            `${law?.act_name || "Unknown Act"} ` +
            `Section ${law?.section_number || "Unknown"} ` +
            `(${
              law?.retrieval_type ||
              law?.retrievalType ||
              "legal_corpus"
            })`
          );
        }
      );
    } catch (ragError) {
      console.error(
        "RESEARCH RAG ERROR:",
        ragError
      );

      legalLaws = [];
    }

    if (
      explicitReferenceRequested &&
      legalLaws.length === 0
    ) {
      legalContext = `
The requested legal provision could not be verified
from the Nyaya AI legal knowledge base.

Requested Act:

${explicitAct?.actName || "Not available"}

Requested Section:

${explicitSection}

IMPORTANT:

Do NOT substitute another Act.

Do NOT substitute another section.

Do NOT answer the requested provision from model memory.

State that the provision could not be verified from
the available legal corpus.
`;
    } else {
      // Built from the SAME retrieval result: no extra search or AI call.
      const candidateCitations =
        buildStatuteCitations(
          legalLaws.slice(0, 4),
          { max: 4 }
        );

      const formattedLegal =
        formatLegalSources(
          legalLaws,
          candidateCitations
        );

      legalContext =
        formattedLegal.text;

      statuteCitations =
        formattedLegal.includedCitations;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | STEP 5 — TINYFISH LIVE WEB RESEARCH
  |--------------------------------------------------------------------------
  */

  let webResearch = null;

  let webSources = [];

  let webCitations = [];

  let webResearchContext =
    "Live web research was not performed for this question.";

  const useWebResearch =
    shouldUseWebResearch(
      userMessage,
      researchMode
    );

  if (useWebResearch) {
    try {
      console.log(
        "RESEARCH WEB: Starting TinyFish research →",
        userMessage
      );

      webResearch =
        await webResearchAgent({
          query: userMessage,
        });

      /*
      |--------------------------------------------------------------------------
      | STEP 8 — NORMALIZED EVIDENCE
      |--------------------------------------------------------------------------
      |
      | One normalised, URL-validated list is used for BOTH the prompt and
      | the sources shown to the user, so they always match.
      |
      */

      webCitations =
        buildWebCitations(
          normalizeWebSources(
            webResearch
          ),
          { max: MAX_WEB_SOURCES }
        );

      webSources =
        webCitations.map(
          (citation, index) => ({
            id: citation.id,
            title: citation.title,
            url: citation.url,
            site_name:
              citation.sourceName,
            snippet:
              citation.snippet || "",
            position: index + 1,
            tier: citation.tier,
          })
        );

      webResearchContext =
        formatWebResearch(
          webCitations
        );

      console.log(
        `RESEARCH WEB: TinyFish returned ${webSources.length} normalized source(s).`
      );

      console.log(
        "RESEARCH WEB: TinyFish research completed."
      );
    } catch (webError) {
      console.error(
        "RESEARCH WEB ERROR:",
        webError
      );

      webResearch = null;
      webSources = [];
      webCitations = [];

      /*
      |--------------------------------------------------------------------------
      | TinyFish failure must NOT break
      | the existing Legal RAG + Groq workflow.
      |--------------------------------------------------------------------------
      */

      webResearchContext =
        "Live web research could not be completed for this question.";
    }
  }

  /*
  |--------------------------------------------------------------------------
  | STEP 6 — MAIN ADVOCATE RESEARCH PROMPT
  |--------------------------------------------------------------------------
  */

  const citationIndex =
    buildCitationIndex([
      ...statuteCitations,
      ...webCitations,
    ]);

  const prompt = `
You are NYAYA AI — an advocate-facing Legal Research and Case Document Assistant.

Your job is to behave like a high-quality conversational AI assistant, but your scope is STRICTLY LIMITED to:

- legal research
- case research
- uploaded legal documents
- FIRs
- court orders
- judgments
- notices
- agreements
- pleadings
- evidence/document review
- legal sections and provisions
- case facts
- procedural questions
- document verification questions
- identifying information contained in uploaded documents
- identifying information missing from uploaded documents
- explaining legal terminology
- explaining applicable Indian legal provisions
- helping an advocate understand the current case/document context

You must remain conversational and remember the conversation context.

==================================================
STRICT SCOPE RULE
==================================================

If the advocate asks something unrelated to the current case, uploaded documents, legal research, or legal work, return EXACTLY:

"${OUT_OF_SCOPE_RESPONSE}"

Examples of questions that are OUT OF SCOPE:

- "How are you?"
- "What should I eat?"
- "Tell me a joke."
- "Write Python code."
- "Help me make a website."
- "What's the weather?"
- "Recommend a movie."
- "Who won the cricket match?"
- general casual conversation unrelated to the case.

Do not answer those questions.

==================================================
LEGAL QUESTIONS WITHOUT DOCUMENTS
==================================================

A document is NOT required for every legal question.

If there is no uploaded document and the advocate asks a legitimate legal research question, use the retrieved Legal RAG material when available.

Do NOT refuse a legitimate legal research question simply because no document is uploaded.

Examples:

- "What is anticipatory bail?"
- "What is Section 420 IPC?"
- "What are the grounds for quashing an FIR?"
- "What is the limitation period for this type of case?"
- "What is Section 103 of BNS?"

If the Legal RAG does not contain enough evidence, clearly state that the available legal evidence is insufficient.

Do not silently replace missing retrieved evidence with invented statutory text.

==================================================
DOCUMENT-BASED QUESTIONS
==================================================

When documents are available, use them as the PRIMARY source for questions about the case.

Examples:

- "What is the case number?"
- "What is the FIR number?"
- "Who are the parties?"
- "What date is mentioned?"
- "Which sections are mentioned?"
- "Is there a signature?"
- "Is there a court seal?"
- "Is the stamp visible?"
- "What happened on page 4?"
- "What information is missing?"
- "Does the document mention the accused?"
- "Does the order grant bail?"

For these questions, rely on the supplied document context.

Do NOT replace document facts with general legal knowledge.

==================================================
ABSOLUTE NO-INVENTION RULE
==================================================

Never fabricate information.

Never guess:

- case numbers
- FIR numbers
- names
- dates
- addresses
- sections
- court names
- police stations
- advocate names
- order details
- page numbers
- signatures
- stamps
- seals
- document authenticity
- events
- facts

If the information is not present in the supplied document context, say:

"The information was not found in the uploaded document."

If the supplied extraction is insufficient to determine something, say:

"I cannot verify that from the available document information."

If the information appears ambiguous or unreadable, say:

"The information is unclear in the available document."

==================================================
SIGNATURE / STAMP / SEAL RULE
==================================================

You may say that a signature, stamp, or seal is present ONLY when the supplied document analysis actually provides reliable visual evidence of it.

Do NOT infer a signature merely because a document normally requires one.

Do NOT infer a stamp merely because it is a court document.

Do NOT infer a seal merely because the document mentions a court or authority.

If visual information is unavailable, say:

"I cannot visually verify the signature/stamp/seal from the available document analysis."

Never claim:

- "The signature is genuine."
- "The stamp is authentic."
- "The seal is official."

unless an actual verification mechanism exists and has been explicitly supplied.

==================================================
PAGE NUMBER RULE
==================================================

Only provide a page number when the available document context actually establishes it.

Do not invent page numbers.

If page-level information is unavailable, say:

"I cannot determine the exact page from the available document context."

==================================================
EXTERNAL DATABASE RULE
==================================================

You do NOT have automatic access to:

- court databases
- police databases
- government databases
- Bar Council databases
- live case-status systems
- live FIR databases
- private legal databases

Never claim that you checked any of these unless an actual external tool has been used and the result has been supplied to you.

TinyFish may provide live web research.

When TinyFish results are supplied:

- distinguish them from uploaded document facts
- distinguish them from internal Legal RAG
- do not claim TinyFish verified legal correctness
- do not treat a search snippet as complete legal authority

==================================================
LEGAL KNOWLEDGE VS DOCUMENT FACTS
==================================================

Clearly distinguish between:

A. FACTS FOUND IN THE DOCUMENT

and

B. GENERAL LEGAL KNOWLEDGE

For example:

"According to the uploaded order, the court..."

versus:

"Under the retrieved statutory material..."

Do not mix assumptions with document facts.

==================================================
LEGAL RAG — PRIMARY STATUTORY SOURCE
==================================================

For statutory/legal research questions, the RETRIEVED LEGAL KNOWLEDGE below is the primary source.

Use it before relying on model knowledge.

If the retrieved material identifies an Act and section, preserve that exact Act and section.

Never reinterpret an explicit legal abbreviation.

BNS
→ The Bharatiya Nyaya Sanhita, 2023

BNSS
→ The Bharatiya Nagarik Suraksha Sanhita, 2023

BSA
→ The Bharatiya Sakshya Adhiniyam, 2023

If the advocate explicitly asks for an Act and section:

1. Preserve the exact Act.
2. Preserve the exact section.
3. Use the retrieved provision.
4. Do not substitute another Act.
5. Do not substitute another section.
6. Do not invent missing statutory text.

If an explicit Act + section was requested but could not be verified from the retrieved legal corpus, clearly say that it could not be verified.

Do NOT answer the missing provision from model memory as though it were verified.

Do not invent:

- Acts
- sections
- subsections
- punishments
- statutory wording
- citations
- legal authorities

Do not assume that a section applies merely because a keyword appears.

Distinguish:

A. RETRIEVED STATUTORY TEXT

from

B. AI EXPLANATION / INTERPRETATION

If the retrieved legal material is insufficient, explicitly say so.

If retrieved text is truncated, do not reconstruct the missing portion from memory.

==================================================
RETRIEVED LEGAL KNOWLEDGE
==================================================

${legalContext}

==================================================
LIVE WEB RESEARCH — TINYFISH
==================================================

Live web research may be provided below when the advocate requests current, recent, live, or external legal research.

When live web sources are available:

1. Treat them as external evidence, not automatically as authoritative legal conclusions.
2. Prefer official court, government, legislative, and other authoritative sources.
3. Clearly distinguish live web information from the internal Nyaya AI legal knowledge base.
4. Never invent information that is not present in the retrieved web sources.
5. Never claim that a source says something unless the supplied source information supports that claim.
6. Do not treat search snippets alone as complete legal authority.
7. If the retrieved web evidence is insufficient, say so.
8. If sources conflict, clearly identify the conflict.
9. Do not manufacture URLs.
10. Never claim that TinyFish verified the legal correctness of a source.

LIVE WEB RESEARCH:

${webResearchContext}

==================================================
CITATION INDEX
==================================================

${citationIndex}

${CITATION_PROMPT_RULES}

If the advocate's own uploaded document states a fact, attribute it to the
document ("According to the uploaded order...") and do not attach a citation
tag to it. Citation tags are only for retrieved legal sources.

==================================================
FOLLOW-UP QUESTIONS
==================================================

The advocate may ask short follow-up questions.

Understand references such as:

- "What about the accused?"
- "And the date?"
- "Which section?"
- "Is it signed?"
- "What happened next?"
- "Show me the missing information."
- "Explain that section."
- "Does page 3 mention it?"

Use previous conversation and document context to understand what they mean.

Do NOT require the advocate to repeat the entire question.

==================================================
ANSWER STYLE
==================================================

Respond naturally and professionally.

Do not unnecessarily repeat the entire question.

For simple or factual questions (for example "What is the FIR number?"),
answer briefly in plain prose. Do not force headings onto short answers.

For substantive legal research questions, organise the answer with markdown
"##" headings, using ONLY the sections that are relevant (never add an empty
or irrelevant section):

## Research Question
## Summary of Findings
## Applicable Indian Laws
## Relevant Sections and Legal Provisions
## Relevant Judgments and Case Law
## Legal Analysis
## Limitations or Conflicting Interpretations

Do NOT write a "Sources and References" section: the system appends it.

Formatting rules:

- Short paragraphs; "-" bullet lists for parallel points.
- Use a markdown table only to compare several items side by side, with a
  header row and concise cells.
- Under "Relevant Sections and Legal Provisions", for each provision state:
  the Act, the exact section/article, and its relevance, with the citation
  tag directly after the claim.
- Keep what a source says (statutory text, or what a retrieved source states)
  clearly separate from your own explanation, for example by labelling
  paragraphs "What the source says" and "Analysis".

Be useful to an advocate.

Do not add unnecessary disclaimers to every response.

When appropriate, mention uncertainty clearly.

==================================================
LEGAL ACCURACY
==================================================

When answering legal questions:

- Do not manufacture case law.
- Do not manufacture citations.
- Do not manufacture sections.
- Do not invent judgments.
- Do not claim a judgment says something unless the supplied evidence supports it.
- If unsure about a legal authority, clearly indicate uncertainty.
- Distinguish current law from historical law when relevant.
- Do not present speculation as established law.
- Prefer retrieved statutory material over model memory.

When discussing Indian law, use terminology applicable to Indian legal practice.

==================================================
CURRENT RESEARCH SESSION
==================================================

Document available:

${documentAvailable ? "YES" : "NO"}

Legal RAG used:

${useLegalRAG ? "YES" : "NO"}

Live web research used:

${useWebResearch ? "YES" : "NO"}

Research mode:

${researchMode}

Explicit Act + Section detected:

${explicitReferenceRequested ? "YES" : "NO"}

==================================================
UPLOADED DOCUMENT CONTEXT
==================================================

${documentContext}

==================================================
PREVIOUS CONVERSATION
==================================================

${conversationHistory}

==================================================
CURRENT ADVOCATE QUESTION
==================================================

${userMessage}

==================================================
FINAL INSTRUCTIONS
==================================================

Answer the CURRENT advocate question.

Use the uploaded document context when relevant.

Use previous conversation when relevant.

For legal/statutory questions, use the retrieved Legal RAG material when available.

For current, recent, live, or external research, use the supplied TinyFish live web research when available.

Clearly distinguish:

1. Uploaded document facts
2. Retrieved statutory/legal knowledge
3. Live web research
4. AI explanation or interpretation

Stay strictly within legal/case/document research.

Do not invent missing information.

Do not invent legal provisions.

Do not substitute another Act for an explicitly requested Act.

If a document fact cannot be verified, say so clearly.

If a legal provision cannot be verified from the retrieved corpus, say so clearly.

If live web evidence is insufficient, say so clearly.

If sources conflict, explain the conflict rather than choosing one without evidence.

If the question is unrelated to the case/legal research, return the exact out-of-scope response and nothing else.

If the question is a legitimate legal question but no document is uploaded, answer using the available retrieved legal material and clearly distinguish verified material from general explanation.
`;

  /*
  |--------------------------------------------------------------------------
  | STEP 7 — CALL GROQ
  |--------------------------------------------------------------------------
  */

  try {
    console.log(
      "RESEARCH CHAT: Sending grounded research request to Groq..."
    );

    const result =
      await askAI(prompt);

    const answer =
      typeof result === "string"
        ? result.trim()
        : "";

    if (!answer) {
      return (
        "I could not generate a research response. " +
        "Please try again."
      );
    }

    console.log(
      "RESEARCH CHAT: Final response generated."
    );

    /*
    |--------------------------------------------------------------------------
    | ATTACH CITATIONS (deterministic, no extra AI or network call)
    |--------------------------------------------------------------------------
    |
    | - [L1]/[W1] tags become real links from retrieval metadata
    | - unknown tags are dropped
    | - links the model wrote itself are removed (unless the advocate's own
    |   uploaded document is in play, where URLs may be legitimate quotes)
    | - a Sources & References section is appended
    | - an honest notice is added when authorities are cited without sources
    |
    */

    if (answer === OUT_OF_SCOPE_RESPONSE) {
      return answer;
    }

    const finalized =
      finalizeAnswer(
        answer,
        [
          ...statuteCitations,
          ...webCitations,
        ],
        {
          removeUnapprovedLinks:
            !documentAvailable,
          listUncitedStatutes: true,
          appendSources: true,
          // A pure document-fact answer (no legal retrieval) should not be
          // flagged just because it repeats a section number from the file.
          noticeWhenUnsourced:
            !documentAvailable ||
            useLegalRAG,
        }
      );

    /*
    |--------------------------------------------------------------------------
    | STEP 8 — RETURN ANSWER + WEB EVIDENCE
    |--------------------------------------------------------------------------
    |
    | IMPORTANT:
    |
    | Deep research now returns:
    |
    | {
    |   answer: "...",
    |   webSources: [...]
    | }
    |
    | If no TinyFish research was used:
    |
    | webSources = []
    |
    |--------------------------------------------------------------------------
    */

    return {
      answer: finalized.text || answer,
      webSources,
      citations: finalized.citations,
      sourcesVerified:
        finalized.sourcesVerified,
      sourceNotices:
        finalized.notices,
    };
  } catch (error) {
    console.error(
      "RESEARCH CHAT AGENT ERROR:",
      error
    );

    const errorMessage =
      String(
        error?.message ||
          error?.error?.message ||
          ""
      ).toLowerCase();

    if (
      errorMessage.includes(
        "too large"
      ) ||
      (
        errorMessage.includes(
          "requested"
        ) &&
        errorMessage.includes(
          "tokens"
        )
      ) ||
      errorMessage.includes(
        "context"
      )
    ) {
      return (
        "The research request contained too much context " +
        "for the AI model. Please make the question more " +
        "specific or ask about one document/section at a time."
      );
    }

    return (
      "I could not complete the legal research request. " +
      "Please try again."
    );
  }
}

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {
  researchChatAgent,
  OUT_OF_SCOPE_RESPONSE,
};