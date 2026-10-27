// Run with: node --test tests/
// Uses only mock data. No network, no AI, no database.
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  sanitizeUrl,
  classifyHost,
  buildStatuteCitations,
  buildWebCitations,
  buildCitationIndex,
  finalizeAnswer,
  SOURCES_UNVERIFIED_NOTICE,
  CASE_LAW_UNVERIFIED_NOTICE,
} = require("../services/citationService");

const law = (over = {}) => ({
  act_name: "The Bharatiya Nyaya Sanhita, 2023",
  act_number: "45 of 2023",
  section_number: "103",
  section_title: "Punishment for murder",
  source_name: "India Code",
  source_url: "https://www.indiacode.nic.in/example/103",
  effective_date: new Date("2024-07-01T00:00:00Z"),
  content: "text",
  ...over,
});

test("sanitizeUrl rejects unsafe or malformed URLs", () => {
  for (const bad of [
    "javascript:alert(1)",
    "data:text/html,hi",
    "ftp://x.gov.in/a",
    "https://user:pw@indiacode.nic.in/a",
    "http://localhost:3000/a",
    "http://127.0.0.1/a",
    "https://intranet/a",
    "https://a.in/has space",
    'https://a.in/"quote',
    "",
    null,
    undefined,
    42,
  ]) {
    assert.equal(sanitizeUrl(bad), null, String(bad));
  }
  assert.ok(sanitizeUrl("https://indiacode.nic.in/x"));
});

test("classifyHost tiers", () => {
  assert.equal(classifyHost("https://indiacode.nic.in/x"), "official");
  assert.equal(classifyHost("https://main.sci.gov.in/x"), "official");
  assert.equal(classifyHost("https://indiankanoon.org/doc/1"), "legal_database");
  assert.equal(classifyHost("https://example.com/x"), "other");
  assert.equal(classifyHost("https://evilindiacode.nic.in.example.com/"), "other");
});

test("statute citations come only from retrieval fields and dedupe", () => {
  const c = buildStatuteCitations([law(), law(), law({ section_number: "104" })]);
  assert.equal(c.length, 2);
  assert.equal(c[0].id, "L1");
  assert.equal(c[0].title, "The Bharatiya Nyaya Sanhita, 2023, Section 103");
  assert.equal(c[0].status, "corpus_official");
  assert.equal(c[0].effectiveDate, "2024-07-01");
});

test("statute without a valid link is kept but has no URL", () => {
  const [c] = buildStatuteCitations([law({ source_url: "javascript:x" })]);
  assert.equal(c.url, "");
  assert.equal(c.status, "corpus_no_link");
});

test("malformed rows do not throw", () => {
  assert.deepEqual(buildStatuteCitations(null), []);
  assert.deepEqual(buildStatuteCitations([null, 5, {}, { act_name: 3 }]), []);
  assert.deepEqual(buildWebCitations([null, "x", { url: 5 }, { url: "bad" }]), []);
  assert.doesNotThrow(() => finalizeAnswer(undefined, undefined));
  assert.doesNotThrow(() => finalizeAnswer("x", "not-an-array"));
});

test("web citations are never marked verified and dedupe by URL", () => {
  const c = buildWebCitations([
    { title: "A", url: "https://indiankanoon.org/doc/1/" },
    { title: "A again", url: "https://indiankanoon.org/doc/1" },
  ]);
  assert.equal(c.length, 1);
  assert.equal(c[0].verified, false);
  assert.equal(c[0].status, "web_unverified");
});

test("finalize: tags become numbered links and Sources section is added", () => {
  const cites = buildStatuteCitations([law()]);
  const out = finalizeAnswer("Murder is punishable under Section 103 BNS [L1].", cites);
  assert.match(out.text, /\[\\\[1\\\]\]\(https:\/\/www\.indiacode\.nic\.in\/example\/103\)/);
  assert.match(out.text, /## Sources & References/);
  assert.equal(out.sourcesVerified, true);
  assert.equal(out.citations[0].cited, true);
});

test("finalize: unknown tags are dropped, not turned into fake sources", () => {
  const out = finalizeAnswer("Claim [L7] and [W3].", buildStatuteCitations([law()]));
  assert.doesNotMatch(out.text.split("---")[0], /\[L7\]|\[W3\]/);
});

test("finalize: model-invented links are removed", () => {
  const out = finalizeAnswer(
    "See [the case](https://fake.example/case) and https://also-fake.example/x for more.",
    []
  );
  assert.doesNotMatch(out.text, /fake\.example/);
  assert.ok(out.notices.some((n) => /removed/i.test(n)));
});

test("finalize: approved links survive", () => {
  const cites = buildStatuteCitations([law()]);
  const out = finalizeAnswer(
    "Read https://www.indiacode.nic.in/example/103 [L1].",
    cites
  );
  assert.match(out.text, /indiacode\.nic\.in\/example\/103/);
});

test("finalize: legal claims without any source get the honest notice", () => {
  const out = finalizeAnswer("Under Section 420 the offence is cheating.", []);
  assert.match(out.text, new RegExp(SOURCES_UNVERIFIED_NOTICE.slice(0, 40)));
  assert.equal(out.sourcesVerified, false);
});

test("finalize: non-legal text gets no notice and no sources section", () => {
  const out = finalizeAnswer("Please describe what happened in more detail.", []);
  assert.doesNotMatch(out.text, /Sources & References/);
});

test("finalize: case law without a retrieved source is flagged", () => {
  const out = finalizeAnswer(
    "In Maneka Gandhi v. Union of India the court expanded Article 21.",
    buildStatuteCitations([law()])
  );
  assert.match(out.text, new RegExp(CASE_LAW_UNVERIFIED_NOTICE.slice(0, 40)));
});

test("finalize: retrieved-but-uncited statutes are still listed", () => {
  const out = finalizeAnswer("Plain explanation without tags.", buildStatuteCitations([law()]));
  assert.match(out.text, /Also retrieved/);
  assert.equal(out.citations[0].cited, false);
});

test("finalize: parentheses in URLs cannot break the markdown link", () => {
  const cites = buildStatuteCitations([law({ source_url: "https://indiacode.nic.in/a(b)c" })]);
  const out = finalizeAnswer("Claim [L1].", cites);
  assert.match(out.text, /a%28b%29c/);
});

test("citation index never leaks URLs to the model", () => {
  const idx = buildCitationIndex(buildStatuteCitations([law()]));
  assert.doesNotMatch(idx, /https?:\/\//);
  assert.match(buildCitationIndex([]), /No citable sources/);
});
