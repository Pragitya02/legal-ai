const askAI = require("../services/groqService");
const caseAnalyzer = require("./caseAnalyzer");
const lawResearchAgent = require("./lawResearchAgent");
const lawyerRecommendationAgent = require("./lawyerRecommendationAgent");
const reportGeneratorAgent = require("./reportGeneratorAgent");

const {
    CITATION_PROMPT_RULES,
    buildCitationIndex,
    finalizeAnswer
} = require("../services/citationService");

console.log("MASTER AGENT USING GROQ");

async function masterAgent(data) {
    try {

        console.log("==================================");
        console.log("MASTER AGENT STARTED");
        console.log("User Request:", data.case);
        console.log("==================================");

        // ==============================
        // STEP 1 - CASE ANALYZER
        // ==============================

        console.log("Running Case Analyzer...");

        const analysis = await caseAnalyzer(data.case);

        // ==============================
        // STEP 2 - LAW RESEARCH
        // ==============================

        console.log("Running Law Research Agent...");

        // Reuses the single retrieval + single AI call of the law research
        // step; the citations come from that same retrieval result.
        const lawResearchResult =
            await lawResearchAgent.lawResearchWithSources(data.case);

        const lawResearch = lawResearchResult.text;

        const statuteCitations = lawResearchResult.citations || [];

        // ==============================
        // STEP 3 - LAWYER RECOMMENDATION
        // ==============================

        console.log("Running Lawyer Recommendation Agent...");

        const lawyerRecommendation =
            await lawyerRecommendationAgent(data.case);

        console.log("==================================");
        console.log("LAWYER RECOMMENDATION OBJECT:");
        console.log(lawyerRecommendation);

        console.log("SPECIALIZATION:");
        console.log(lawyerRecommendation?.specialization);

        // ==============================
        // STEP 4 - REPORT GENERATOR
        // ==============================

        console.log("Running Report Generator...");

        const report = await reportGeneratorAgent(
            analysis,
            lawResearch,
            lawyerRecommendation?.specialization || "General Lawyer"
        );

        console.log("==================================");
        console.log("CASE ANALYSIS");
        console.log(analysis);

        console.log("==================================");
        console.log("LEGAL RESEARCH");
        console.log(lawResearch);

        console.log("==================================");
        console.log("REPORT");
        console.log(report);

        // ==============================
        // FINAL PROMPT
        // ==============================

        const prompt = `
You are NyayaAI, an expert Indian legal assistant.

A specialized multi-agent AI system has already analyzed the user's case.

================================

CASE ANALYSIS

${analysis}

================================

LEGAL RESEARCH

${lawResearch}

================================

RECOMMENDED LEGAL SPECIALIZATION

${lawyerRecommendation?.specialization || "General Lawyer"}

================================

CITATION INDEX

${buildCitationIndex(statuteCitations)}

================================

Now use ALL of the above information together with the user's original legal issue to generate the final legal guidance.

USER'S LEGAL ISSUE:

${data.case}

Follow ONLY Indian law.

Use:

- Bharatiya Nyaya Sanhita (BNS)
- Bharatiya Nagarik Suraksha Sanhita (BNSS)
- Bharatiya Sakshya Adhiniyam (BSA)
- Constitution of India
- Relevant Acts whenever applicable.

Your response must include these sections, each with a markdown "##" heading:

1. Case Summary
2. Relevant Indian Legal Sections
3. Punishment (if applicable)
4. Citizen Rights
5. Next Steps
6. Documents Required
7. Whether consulting a lawyer is recommended

FORMATTING:

- Use "##" headings, short paragraphs and "-" bullet lists.
- Use a markdown table only when comparing several items.
- In "Relevant Indian Legal Sections", for each provision give:
  the full name of the Act, the exact section number, and a one-line
  explanation of why it is relevant.
- Keep statutory text (what the source says) separate from your own
  explanation.

${CITATION_PROMPT_RULES}

This assistant has no judgment database. Do not cite specific judgments as
verified authority. If a well-known principle needs a case, say it is from
general legal knowledge and has not been verified from retrieved sources.

IMPORTANT:

- Mention ONLY the type of lawyer required.
- DO NOT mention any lawyer names.
- DO NOT recommend any law firms.
- DO NOT mention advocates from the database.
- Keep the response professional and easy to understand.
- Do not invent legal sections.
- Clearly state when the available information is insufficient.
`;

        // ==============================
        // FINAL AI RESPONSE
        // ==============================

        console.log("Sending request to Groq...");

        const answer = await askAI(prompt);

        console.log("FINAL RESPONSE GENERATED");

        // ==============================
        // VALIDATE AI RESPONSE
        // ==============================

        const finalAnswer =
            typeof answer === "string"
                ? answer
                : answer?.response
                    ? String(answer.response)
                    : answer?.message
                        ? String(answer.message)
                        : "I could not generate a legal response.";
        // ==============================
        // ATTACH VERIFIED CITATIONS
        // ==============================
        // Deterministic post-processing: no extra AI or network call.

        const finalized = finalizeAnswer(
            finalAnswer,
            statuteCitations,
            {
                removeUnapprovedLinks: true,
                listUncitedStatutes: true,
                appendSources: true
            }
        );

        // AI analysis does NOT create a case.
        // Cases are created explicitly by the user through
        // POST /api/cases (New Case page).

        // ==============================
        // RETURN FINAL RESULT
        // ==============================

        return {
            success: true,
            response: finalized.text || finalAnswer,
            specialization:
                lawyerRecommendation?.specialization ||
                "General Lawyer",
            citations: finalized.citations,
            sourcesVerified: finalized.sourcesVerified,
            sourceNotices: finalized.notices
        };

    } catch (err) {

        console.error("==================================");
        console.error("MASTER AGENT ERROR");
        console.error("==================================");

        console.error(err);

        return {
            success: false,
            response: "Unable to generate legal guidance at this time.",
            error:
                err?.message ||
                "Failed to analyze case"
        };
    }
}

module.exports = masterAgent;