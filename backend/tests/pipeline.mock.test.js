// Runs the REAL masterAgent / researchChatAgent code with every paid or
// external dependency stubbed. No network, no Groq, no TinyFish, no database.
// Run with: node --test tests/pipeline.mock.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const root = path.join(__dirname, "..");
const abs = (p) => require.resolve(path.join(root, p));

function stub(modulePath, exports) {
  const id = abs(modulePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}

const calls = { ai: 0, web: 0, retrieval: 0, prompts: [] };
// Agents destructure these functions at import time, so behaviour is switched
// through mutable state rather than by reassigning module properties.
const behaviour = { retrievalEmpty: false, webFails: false };
let nextAiReplies = [];

const LAWS = [
  {
    id: 1,
    act_name: "The Bharatiya Nyaya Sanhita, 2023",
    act_number: "45 of 2023",
    section_number: "318",
    section_title: "Cheating",
    content: "Whoever cheats ...",
    source_name: "India Code",
    source_url: "https://www.indiacode.nic.in/mock/bns/318",
    effective_date: new Date("2024-07-01T00:00:00Z"),
    retrieval_type: "exact",
  },
  {
    id: 2,
    act_name: "The Bharatiya Nyaya Sanhita, 2023",
    act_number: "45 of 2023",
    section_number: "318",
    section_title: "Cheating (duplicate row)",
    content: "dup",
    source_name: "India Code",
    source_url: "https://www.indiacode.nic.in/mock/bns/318",
    retrieval_type: "fulltext",
  },
];

stub("services/groqService.js", async (prompt) => {
  calls.ai += 1;
  calls.prompts.push(prompt);
  return nextAiReplies.length ? nextAiReplies.shift() : "mock reply";
});

stub("services/legalRetrievalService.js", {
  retrieveRelevantLaws: async () => {
    calls.retrieval += 1;
    return behaviour.retrievalEmpty ? [] : LAWS;
  },
  extractSectionNumber: () => null,
  detectAct: () => null,
});

stub("services/tinyfishService.js", {
  tinyFishSearch: async () => {
    calls.web += 1;
    if (behaviour.webFails) {
      throw new Error("boom");
    }
    return {
      results: [
        { position: 1, title: "SC judgment", url: "https://main.sci.gov.in/mock/j1", site_name: "sci.gov.in", snippet: "s1" },
        { position: 2, title: "Bad scheme", url: "javascript:alert(1)", site_name: "x", snippet: "s2" },
        { position: 3, title: "Dup", url: "https://main.sci.gov.in/mock/j1/", site_name: "x", snippet: "s3" },
        { position: 4, title: "Blog", url: "https://example.com/post", site_name: "example", snippet: "s4" },
      ],
    };
  },
});

stub("database/lawyerModel.js", { getAllLawyers: async () => [] });

const masterAgent = require("../agents/masterAgent");
const { researchChatAgent } = require("../agents/researchChatAgent");

function reset() {
  calls.ai = 0;
  calls.web = 0;
  calls.retrieval = 0;
  calls.prompts = [];
  nextAiReplies = [];
  behaviour.retrievalEmpty = false;
  behaviour.webFails = false;
}

test("Assistant: citations flow retrieval -> prompt -> link; no extra calls", async () => {
  reset();
  nextAiReplies = [
    "Case Type: Fraud",               // caseAnalyzer
    "Cheating is covered [L1].",       // lawResearch
    "## Relevant Indian Legal Sections\nCheating: BNS Section 318 [L1]. Fake: [L5] https://invented.example/x",
  ];

  const result = await masterAgent({ case: "Someone cheated me online" });

  assert.equal(result.success, true);
  assert.equal(calls.retrieval, 1, "exactly one retrieval");
  assert.equal(calls.ai, 3, "exactly three model calls (unchanged from before)");

  // Final prompt must carry the citation index but NOT a URL or the duplicated report.
  const finalPrompt = calls.prompts[2];
  assert.match(finalPrompt, /CITATION INDEX/);
  assert.match(finalPrompt, /\[L1\]/);
  assert.doesNotMatch(finalPrompt, /GENERATED REPORT/);
  assert.doesNotMatch(finalPrompt, /indiacode\.nic\.in/);

  // Output: real link from retrieval; invented link and unknown tag removed.
  assert.match(result.response, /indiacode\.nic\.in\/mock\/bns\/318/);
  assert.doesNotMatch(result.response, /invented\.example/);
  assert.doesNotMatch(result.response.split("## Sources")[0], /\[L5\]/);
  assert.match(result.response, /## Sources & References/);
  assert.equal(result.sourcesVerified, true);
  assert.equal(result.citations.length, 1, "duplicate provision de-duplicated");
});

test("Research (deep): web + statute sources, unsafe/duplicate web links dropped", async () => {
  reset();
  nextAiReplies = [
    "## Summary of Findings\nCheating is an offence [L1]. The Supreme Court order is at [W1]. Also see [W2].",
  ];

  const out = await researchChatAgent({
    message: "Explain cheating under BNS with relevant judgments",
    researchMode: "deep",
  });

  assert.equal(calls.ai, 1, "one model call");
  assert.equal(calls.web, 1, "one web search");
  assert.equal(calls.retrieval, 1, "one retrieval");

  // javascript: link and the duplicate were removed before the model or user saw them.
  const urls = out.webSources.map((s) => s.url);
  assert.deepEqual(urls, ["https://main.sci.gov.in/mock/j1", "https://example.com/post"]);
  assert.doesNotMatch(calls.prompts[0], /javascript:/);

  assert.match(out.answer, /main\.sci\.gov\.in\/mock\/j1/);
  assert.match(out.answer, /not independently verified/i);
  assert.equal(out.sourcesVerified, true);
  assert.ok(out.citations.some((c) => c.kind === "web" && !c.verified));
});

test("Research: model answers legally with no retrieval -> honest notice, no fake source", async () => {
  reset();
  behaviour.retrievalEmpty = true;
  nextAiReplies = ["Under Section 420 IPC cheating is punishable."];

  const out = await researchChatAgent({ message: "What is Section 420 IPC punishment?" });

  assert.match(out.answer, /Sources could not be verified/);
  assert.equal(out.sourcesVerified, false);
  assert.equal(out.citations.length, 0);
});

test("Research: out-of-scope reply is returned untouched", async () => {
  reset();
  const out = await researchChatAgent({ message: "Tell me a joke" });
  assert.equal(calls.ai, 0, "no model call for obviously out-of-scope input");
  assert.equal(typeof out, "string");
});

test("Research: provider failure in web search does not break the answer", async () => {
  reset();
  behaviour.webFails = true;
  nextAiReplies = ["Plain explanation."];
  const out = await researchChatAgent({ message: "latest amendments to cheating law" });
  assert.equal(typeof out.answer, "string");
  assert.deepEqual(out.webSources, []);
});
