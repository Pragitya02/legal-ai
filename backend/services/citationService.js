/*
|--------------------------------------------------------------------------
| CITATION SERVICE
|--------------------------------------------------------------------------
|
| Pure, offline helpers. This module makes NO network calls and NO AI calls,
| so it costs no API credits.
|
| Responsibilities
|
|   1. Validate / classify source URLs that came from retrieval.
|   2. Turn retrieval results (legal_knowledge rows, TinyFish web results)
|      into stable citation objects with IDs such as L1 (statute) and W1 (web).
|   3. Build the "citation index" that is given to the model so it can refer
|      to sources by ID instead of inventing links.
|   4. Finalise the model's answer: replace [L1]/[W2] tags with real links,
|      remove tags/links that were not supplied by retrieval, append a
|      deterministic "Sources & References" section, and attach an honest
|      notice when legal authorities are mentioned without a retrieved source.
|
| The backend owns source metadata and validation. The frontend only renders.
|
*/

const SOURCES_UNVERIFIED_NOTICE =
  "Sources could not be verified for this response. Please consult the " +
  "relevant official legal source before relying on this information.";

const CASE_LAW_UNVERIFIED_NOTICE =
  "Judgments named in this response were not matched to a retrieved source " +
  "and have not been verified. Please check the official Supreme Court or " +
  "High Court record before relying on them.";

const WEB_SOURCE_NOTICE =
  "Web results are retrieved by live search and have not been independently " +
  "verified as accurate or current.";

/*
|--------------------------------------------------------------------------
| URL VALIDATION
|--------------------------------------------------------------------------
*/

const MAX_URL_LENGTH = 2000;

// Hosts that are official Government of India / judiciary sources even when
// they do not end in .gov.in or .nic.in.
const OFFICIAL_HOST_SUFFIXES = [
  ".gov.in",
  ".nic.in",
];

const OFFICIAL_HOSTS = new Set([
  "indiacode.nic.in",
  "legislative.gov.in",
  "egazette.gov.in",
  "sci.gov.in",
  "main.sci.gov.in",
  "digiscr.sci.gov.in",
  "ecourts.gov.in",
  "lawmin.gov.in",
  "doj.gov.in",
  "indiacode.gov.in",
]);

// Reputable secondary legal databases / legal publications.
const LEGAL_DATABASE_HOSTS = new Set([
  "indiankanoon.org",
  "scconline.com",
  "manupatra.com",
  "livelaw.in",
  "barandbench.com",
  "casemine.com",
  "vlex.in",
  "latestlaws.com",
  "lawtrend.in",
  "verdictum.in",
]);

function hostMatches(hostname, set) {
  if (set.has(hostname)) {
    return true;
  }

  for (const host of set) {
    if (hostname.endsWith(`.${host}`)) {
      return true;
    }
  }

  return false;
}

function isPrivateOrLocalHost(hostname) {
  if (!hostname.includes(".")) {
    return true; // localhost, intranet names
  }

  if (
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
      hostname
    )
  ) {
    return true;
  }

  if (hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return true;
  }

  return false;
}

/**
 * Returns a normalised http(s) URL string, or null when the value is not a
 * safe, displayable link.
 */
function sanitizeUrl(raw) {
  if (typeof raw !== "string") {
    return null;
  }

  const value = raw.trim();

  if (!value || value.length > MAX_URL_LENGTH) {
    return null;
  }

  // No whitespace, control characters, quotes or angle brackets.
  if (/[\s\u0000-\u001f<>"'`\\]/.test(value)) {
    return null;
  }

  let parsed;

  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return null;
  }

  if (parsed.username || parsed.password) {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();

  if (isPrivateOrLocalHost(hostname)) {
    return null;
  }

  return parsed.toString();
}

/**
 * official        - Government of India legislation / judiciary websites
 * legal_database  - reputable secondary legal databases and publications
 * other           - anything else
 */
function classifyHost(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();

    if (
      OFFICIAL_HOSTS.has(hostname) ||
      OFFICIAL_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))
    ) {
      return "official";
    }

    if (hostMatches(hostname, LEGAL_DATABASE_HOSTS)) {
      return "legal_database";
    }
  } catch {
    // fall through
  }

  return "other";
}

function cleanString(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);

  return match ? match[0] : "";
}

/*
|--------------------------------------------------------------------------
| BUILD CITATIONS FROM RETRIEVAL RESULTS
|--------------------------------------------------------------------------
*/

/**
 * Build statute citations from legal_knowledge rows returned by
 * legalRetrievalService. Only fields actually present on the row are used.
 *
 * `status`
 *   corpus_official  - from the Nyaya AI legal corpus, with an official link
 *   corpus_linked    - from the corpus, link is not an official host
 *   corpus_no_link   - from the corpus, no usable link stored
 */
function buildStatuteCitations(laws, { max = 8 } = {}) {
  if (!Array.isArray(laws)) {
    return [];
  }

  const seen = new Set();
  const citations = [];

  for (let lawIndex = 0; lawIndex < laws.length; lawIndex++) {
    const law = laws[lawIndex];

    if (citations.length >= max) {
      break;
    }

    if (!law || typeof law !== "object") {
      continue;
    }

    const act = cleanString(law.act_name, 300);
    const section = cleanString(String(law.section_number ?? ""), 50);

    if (!act) {
      continue;
    }

    const dedupeKey = `${act.toLowerCase()}|${section.toLowerCase()}`;

    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);

    const url = sanitizeUrl(law.source_url) || "";
    const tier = url ? classifyHost(url) : "other";

    let status = "corpus_no_link";

    if (url) {
      status = tier === "official" ? "corpus_official" : "corpus_linked";
    }

    const sectionTitle = cleanString(law.section_title, 300);

    citations.push({
      id: `L${citations.length + 1}`,
      lawIndex, // index of the source row in the retrieval result
      kind: "statute",
      title: section ? `${act}, Section ${section}` : act,
      act,
      actNumber: cleanString(String(law.act_number ?? ""), 50),
      section,
      sectionTitle,
      url,
      sourceName: cleanString(law.source_name, 200),
      tier,
      status,
      effectiveDate: formatDate(law.effective_date),
      verified: Boolean(section),
    });
  }

  return citations;
}

/**
 * Build web citations from already-normalised TinyFish results
 * ({ title, url, site_name, snippet }). Web results are never marked
 * verified: a search hit is not proof of what a legal provision says.
 */
function buildWebCitations(webSources, { max = 6 } = {}) {
  if (!Array.isArray(webSources)) {
    return [];
  }

  const seen = new Set();
  const citations = [];

  for (const source of webSources) {
    if (citations.length >= max) {
      break;
    }

    if (!source || typeof source !== "object") {
      continue;
    }

    const url = sanitizeUrl(source.url);

    if (!url) {
      continue;
    }

    const dedupeKey = url.replace(/\/+$/, "").toLowerCase();

    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);

    citations.push({
      id: `W${citations.length + 1}`,
      kind: "web",
      title: cleanString(source.title, 300) || "Untitled source",
      act: "",
      actNumber: "",
      section: "",
      sectionTitle: "",
      url,
      sourceName: cleanString(source.site_name, 200),
      tier: classifyHost(url),
      status: "web_unverified",
      effectiveDate: "",
      verified: false,
      snippet: cleanString(source.snippet, 400),
    });
  }

  return citations;
}

/*
|--------------------------------------------------------------------------
| CITATION INDEX (given to the model)
|--------------------------------------------------------------------------
*/

const TIER_LABEL = {
  official: "official government/judiciary website",
  legal_database: "secondary legal database or publication",
  other: "general website",
};

/**
 * Text block placed in the prompt. The model refers to sources by ID only;
 * it is told never to write URLs itself.
 */
function buildCitationIndex(citations) {
  if (!Array.isArray(citations) || citations.length === 0) {
    return (
      "No citable sources were retrieved for this question. Do not " +
      "write [L#] or [W#] tags and do not write any URLs."
    );
  }

  return citations
    .map((c) => {
      const lines = [`[${c.id}] ${c.title}`];

      if (c.sectionTitle) {
        lines.push(`    Section title: ${c.sectionTitle}`);
      }

      if (c.effectiveDate) {
        lines.push(`    Effective date: ${c.effectiveDate}`);
      }

      lines.push(
        c.kind === "statute"
          ? "    Type: statute provision from the Nyaya AI legal knowledge base"
          : "    Type: live web search result (not independently verified)"
      );

      lines.push(`    Host type: ${TIER_LABEL[c.tier] || TIER_LABEL.other}`);
      lines.push(`    Link available: ${c.url ? "yes" : "no"}`);

      return lines.join("\n");
    })
    .join("\n");
}

/*
|--------------------------------------------------------------------------
| PROMPT RULES (shared by Assistant and Research)
|--------------------------------------------------------------------------
*/

const CITATION_PROMPT_RULES = `
CITATION RULES (mandatory)

1. Whenever you state what a law, section, article, rule or judgment says,
   identify it precisely: the full name of the Act, the exact section /
   article number, and a short note on why it is relevant.
2. Cite sources ONLY by the IDs in the CITATION INDEX, written as [L1] or
   [W2], placed directly after the claim they support. Several IDs may be
   written as [L1][L2].
3. NEVER write a URL, never create a new ID, and never write your own
   "Sources" or "References" section. The system adds verified links and the
   Sources & References section after your answer.
4. If a provision you want to mention is NOT in the CITATION INDEX, you may
   still mention it, but you must say it was "not verified from the retrieved
   sources" and you must not attach any tag or link to it.
5. Judgments: name a judgment as authority ONLY if it appears in the supplied
   sources. Give the case name, court, year and citation exactly as the source
   states them. Never invent a case name, citation, date, paragraph number or
   quotation. If you recall a judgment from general knowledge, label it
   clearly as "not verified from the retrieved sources".
6. Authority: a Supreme Court of India decision binds all courts in India
   (Article 141); a High Court decision binds courts within its own
   jurisdiction and is persuasive elsewhere. State this only when the court is
   identified in the supplied sources.
7. Separate what the source says (statutory text, or what a source states)
   from your own explanation and analysis, and label them as such.
8. Do not present a repealed or amended law as current. If the effective date
   or applicability is unclear from the sources, say so.
9. If supplied sources conflict, explain the conflict instead of silently
   choosing one.
`;

/*
|--------------------------------------------------------------------------
| ANSWER FINALISATION
|--------------------------------------------------------------------------
*/

const TAG_PATTERN = /\[((?:[LW]\d{1,2})(?:\s*[,;]?\s*[LW]\d{1,2})*)\]/g;

// Statutory / constitutional references or named courts.
const LEGAL_REFERENCE_PATTERN =
  /\b(?:section|sections|sec\.|article|articles|rule|rules)\s+\d+[a-z]?\b|\b(?:BNS|BNSS|BSA|IPC|CrPC|CPC|Constitution of India)\b|\b(?:Act|Sanhita|Adhiniyam),?\s+(?:of\s+)?\d{4}\b|\b(?:Supreme Court|High Court)\b/i;

// Case-law style references.
const CASE_LAW_PATTERN =
  /\b[A-Z][\w.'&-]*(?:\s+[A-Za-z][\w.'&-]*){0,5}\s+(?:v\.|vs\.?|versus)\s+[A-Z]|\b(?:Supreme Court|High Court)\b[^.\n]{0,100}\b(?:held|ruled|observed|decided|laid down)\b/;

function mentionsLegalAuthority(text) {
  return LEGAL_REFERENCE_PATTERN.test(String(text || ""));
}

function mentionsCaseLaw(text) {
  return CASE_LAW_PATTERN.test(String(text || ""));
}

function escapeMarkdownText(text) {
  return String(text).replace(/([\\`*_{}\[\]<>|])/g, "\\$1");
}

// Parentheses would terminate a markdown link target early.
function markdownUrl(url) {
  return url.replace(/\(/g, "%28").replace(/\)/g, "%29");
}

function normaliseForCompare(url) {
  return String(url || "")
    .trim()
    .replace(/[)\].,;:!?]+$/, "")
    .replace(/\/+$/, "")
    .toLowerCase();
}

/**
 * Remove links the model produced that did not come from retrieval.
 * Returns { text, removed } where removed is the number of links removed.
 */
function stripUnapprovedUrls(text, citations) {
  const allowed = new Set(
    citations.map((c) => normaliseForCompare(c.url)).filter(Boolean)
  );

  let removed = 0;

  // Markdown links: [label](url)
  let output = text.replace(
    /\[([^\]\n]{1,300})\]\((https?:\/\/[^)\s]+)\)/gi,
    (match, label, url) => {
      if (allowed.has(normaliseForCompare(url))) {
        return match;
      }

      removed += 1;
      return label;
    }
  );

  // Bare URLs
  output = output.replace(/https?:\/\/[^\s)<>\]]+/gi, (url) => {
    if (allowed.has(normaliseForCompare(url))) {
      return url;
    }

    removed += 1;
    return "(link removed: not from retrieved sources)";
  });

  return { text: output, removed };
}

function describeCitation(citation, number) {
  const marker = `**[${number}]**`;

  let title;

  if (citation.kind === "statute") {
    title = escapeMarkdownText(citation.title);

    if (citation.sectionTitle) {
      title += ` — ${escapeMarkdownText(citation.sectionTitle)}`;
    }
  } else {
    title = escapeMarkdownText(citation.title);
  }

  const parts = [];

  if (citation.url) {
    const label = citation.sourceName
      ? escapeMarkdownText(citation.sourceName)
      : "Open source";

    parts.push(`[${label}](${markdownUrl(citation.url)})`);
  } else {
    parts.push("no link available");
  }

  if (citation.kind === "statute") {
    parts.push(
      citation.status === "corpus_official"
        ? "Official source link"
        : "From Nyaya AI legal knowledge base"
    );

    if (citation.effectiveDate) {
      parts.push(`Effective ${citation.effectiveDate}`);
    }
  } else {
    parts.push(
      citation.tier === "official"
        ? "Official website (web result, not independently verified)"
        : citation.tier === "legal_database"
          ? "Legal database / publication (web result, not independently verified)"
          : "Web result, not independently verified"
    );
  }

  return `${marker} ${title}  \n${parts.join(" · ")}`;
}

function toPublicCitation(citation, number, cited) {
  return {
    n: number,
    id: citation.id,
    kind: citation.kind,
    title: citation.title,
    act: citation.act,
    section: citation.section,
    sectionTitle: citation.sectionTitle,
    url: citation.url,
    sourceName: citation.sourceName,
    tier: citation.tier,
    status: citation.status,
    effectiveDate: citation.effectiveDate,
    verified: citation.verified,
    cited,
  };
}

/**
 * Finalise a model answer.
 *
 * @param {string} rawAnswer
 * @param {Array}  citations   statute + web citations given to the model
 * @param {Object} options
 *   removeUnapprovedLinks  strip links not supplied by retrieval
 *   listUncitedStatutes    list retrieved statutes even if not tagged
 *   appendSources          append the Sources & References section
 *   noticeWhenUnsourced    add the "could not be verified" notice when legal
 *                          authorities are mentioned but no source exists
 *
 * @returns {{ text, citations, sourcesVerified, notices }}
 */
function finalizeAnswer(
  rawAnswer,
  citations,
  {
    removeUnapprovedLinks = true,
    listUncitedStatutes = true,
    appendSources = true,
    noticeWhenUnsourced = true,
  } = {}
) {
  const list = Array.isArray(citations) ? citations : [];
  const byId = new Map(list.map((c) => [c.id, c]));

  let text = typeof rawAnswer === "string" ? rawAnswer.trim() : "";

  if (!text) {
    return {
      text: "",
      citations: [],
      sourcesVerified: false,
      notices: [],
    };
  }

  const notices = [];

  /*
   | 1. Remove links the model wrote itself.
   */
  if (removeUnapprovedLinks) {
    const stripped = stripUnapprovedUrls(text, list);
    text = stripped.text;

    if (stripped.removed > 0) {
      notices.push(
        "Some links written by the AI were removed because they did not " +
          "come from the retrieved sources."
      );
    }
  }

  /*
   | 2. Replace [L1]/[W2] tags with numbered links, numbering by first use.
   */
  const numberById = new Map();
  const usedOrder = [];

  const numberFor = (id) => {
    if (!numberById.has(id)) {
      numberById.set(id, numberById.size + 1);
      usedOrder.push(id);
    }

    return numberById.get(id);
  };

  text = text.replace(TAG_PATTERN, (match, group) => {
    const ids = group.match(/[LW]\d{1,2}/g) || [];

    const rendered = ids
      .map((id) => {
        const citation = byId.get(id);

        if (!citation) {
          return ""; // unknown tag: drop it rather than show a fake source
        }

        const number = numberFor(id);

        return citation.url
          ? `[\\[${number}\\]](${markdownUrl(citation.url)})`
          : `\\[${number}\\]`;
      })
      .filter(Boolean)
      .join("");

    return rendered;
  });

  /*
   | 3. Decide which citations are listed.
   */
  const listed = usedOrder.map((id) => ({
    citation: byId.get(id),
    number: numberById.get(id),
    cited: true,
  }));

  if (listUncitedStatutes) {
    for (const citation of list) {
      if (citation.kind === "statute" && !numberById.has(citation.id)) {
        const number = numberFor(citation.id);

        listed.push({ citation, number, cited: false });
      }
    }
  }

  const citedWebCount = listed.filter(
    (item) => item.cited && item.citation.kind === "web"
  ).length;

  const hasAnySource = listed.length > 0;

  /*
   | 4. Honest notices.
   */
  const authorityMentioned = mentionsLegalAuthority(text);

  if (noticeWhenUnsourced && authorityMentioned && !hasAnySource) {
    notices.push(SOURCES_UNVERIFIED_NOTICE);
  }

  if (mentionsCaseLaw(text) && citedWebCount === 0) {
    notices.push(CASE_LAW_UNVERIFIED_NOTICE);
  }

  if (citedWebCount > 0) {
    notices.push(WEB_SOURCE_NOTICE);
  }

  /*
   | 5. Append the deterministic Sources & References section.
   */
  if (appendSources && (hasAnySource || notices.length > 0)) {
    const sections = ["---", "## Sources & References"];

    if (listed.length > 0) {
      const citedItems = listed.filter((item) => item.cited);
      const uncitedItems = listed.filter((item) => !item.cited);

      if (citedItems.length > 0) {
        sections.push(
          citedItems
            .map((item) => describeCitation(item.citation, item.number))
            .join("\n\n")
        );
      }

      if (uncitedItems.length > 0) {
        sections.push(
          "**Also retrieved for this question (not cited directly above):**"
        );
        sections.push(
          uncitedItems
            .map((item) => describeCitation(item.citation, item.number))
            .join("\n\n")
        );
      }
    }

    if (notices.length > 0) {
      sections.push(notices.map((notice) => `> ${notice}`).join("\n>\n"));
    }

    text = `${text}\n\n${sections.join("\n\n")}`;
  }

  const publicCitations = listed.map((item) =>
    toPublicCitation(item.citation, item.number, item.cited)
  );

  const sourcesVerified = listed.some(
    (item) => item.citation.kind === "statute" && item.citation.verified
  );

  return {
    text,
    citations: publicCitations,
    sourcesVerified,
    notices,
  };
}

module.exports = {
  SOURCES_UNVERIFIED_NOTICE,
  CASE_LAW_UNVERIFIED_NOTICE,
  CITATION_PROMPT_RULES,
  sanitizeUrl,
  classifyHost,
  buildStatuteCitations,
  buildWebCitations,
  buildCitationIndex,
  finalizeAnswer,
  mentionsLegalAuthority,
  mentionsCaseLaw,
  stripUnapprovedUrls,
};
