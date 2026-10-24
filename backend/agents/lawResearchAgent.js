const askAI = require("../services/groqService");

const {
    retrieveRelevantLaws,
    extractSectionNumber,
    detectAct
} = require("../services/legalRetrievalService");


// ============================================================
// LEGAL CONTEXT FORMATTER
// ============================================================

function formatRetrievedLaws(
    laws,
    {
        maxSources = 5,
        maxContentCharsPerSource = 3000,
        maxTotalChars = 14000
    } = {}
) {

    if (!laws || laws.length === 0) {
        return "No relevant provisions were found in the legal knowledge base.";
    }

    const selectedLaws = laws.slice(0, maxSources);

    let totalChars = 0;
    const formattedSources = [];

    for (let index = 0; index < selectedLaws.length; index++) {

        const law = selectedLaws[index];

        let content = law.content || "";

        // ----------------------------------------------------
        // Per-source safety limit
        // ----------------------------------------------------

        if (content.length > maxContentCharsPerSource) {

            content =
                content.substring(0, maxContentCharsPerSource) +
                "\n[Legal text truncated for context-size safety.]";
        }


        // ----------------------------------------------------
        // Total context safety limit
        // ----------------------------------------------------

        const sourceHeader = `
SOURCE ${index + 1}

Act:
${law.act_name || "Not available"}

Act Number:
${law.act_number || "Not available"}

Section:
${law.section_number || "Not available"}

Section Title:
${law.section_title || "Not available"}

Legal Text:
`;

        const sourceFooter = `

Source:
${law.source_url || law.source_name || "Not available"}

Effective Date:
${law.effective_date || "Not available"}
`;

        const remainingChars =
            maxTotalChars - totalChars - sourceHeader.length - sourceFooter.length;

        if (remainingChars <= 0) {
            break;
        }


        // ----------------------------------------------------
        // Trim content if this source would exceed total budget
        // ----------------------------------------------------

        if (content.length > remainingChars) {

            if (remainingChars < 500) {
                break;
            }

            content =
                content.substring(0, remainingChars) +
                "\n[Legal context truncated due to total context-size limit.]";
        }


        const formattedSource =
            sourceHeader +
            content +
            sourceFooter;


        formattedSources.push(formattedSource);

        totalChars += formattedSource.length;


        if (totalChars >= maxTotalChars) {
            break;
        }
    }


    return formattedSources.join(
        "\n-----------------------------\n"
    );
}


// ============================================================
// LAW RESEARCH AGENT
// ============================================================

async function lawResearchAgent(caseDescription) {

    try {

        // ====================================================
        // STEP 1
        // DETECT EXPLICIT LEGAL REFERENCES
        // ====================================================

        /*
         * This is deterministic.
         *
         * Example:
         *
         * "What is Section 63 of BSA?"
         *
         * resolves to:
         *
         * The Bharatiya Sakshya Adhiniyam, 2023
         * Section 63
         *
         * The retrieval service performs an exact database
         * lookup before generic FULLTEXT retrieval.
         */

        const explicitSection =
            extractSectionNumber(caseDescription);

        const explicitAct =
            detectAct(caseDescription);


        if (
            explicitSection &&
            explicitAct
        ) {

            console.log(
                "LEGAL RESEARCH: Explicit legal reference detected →",
                `${explicitAct.actName} Section ${explicitSection}`
            );
        }


        // ====================================================
        // STEP 2
        // RETRIEVE LEGAL PROVISIONS
        // ====================================================

        /*
         * Request a larger candidate set from the retrieval
         * layer, but we will NOT send all candidates to the LLM.
         *
         * This allows the retrieval system to search broadly
         * while keeping the final LLM context small.
         */

        const laws =
            await retrieveRelevantLaws(
                caseDescription,
                8
            );


        console.log(
            `LEGAL RAG: Retrieved ${laws.length} provision(s)`
        );


        // ====================================================
        // STEP 3
        // HANDLE EXPLICIT ACT + SECTION FAILURE
        // ====================================================

        /*
         * If the user explicitly requested:
         *
         * BSA Section 63
         *
         * but the exact provision was not retrieved,
         *
         * DO NOT substitute a similarly worded section from
         * another Act.
         */

        if (
            explicitSection &&
            explicitAct &&
            laws.length === 0
        ) {

            return (
                `The requested provision could not be found in the ` +
                `legal knowledge base: ${explicitAct.actName}, ` +
                `Section ${explicitSection}. ` +
                `No substitute provision from another Act will be used.`
            );
        }


        // ====================================================
        // STEP 4
        // BUILD CONTROLLED LEGAL CONTEXT
        // ====================================================

        /*
         * IMPORTANT:
         *
         * Previously:
         *
         * 8 sources × 4500 characters
         *
         * could produce approximately 36,000 characters,
         * which caused the Groq request to exceed the
         * 8,000-token limit.
         *
         * Now:
         *
         * Maximum 5 sources
         * Maximum 3000 chars/source
         * Maximum 14000 chars total
         *
         * This keeps the request comfortably below the
         * model's input limit.
         */

        const legalContext =
            formatRetrievedLaws(
                laws,
                {
                    maxSources: 5,
                    maxContentCharsPerSource: 3000,
                    maxTotalChars: 14000
                }
            );


        console.log(
            `LEGAL RAG: Legal context prepared (${legalContext.length} characters)`
        );


        // ====================================================
        // STEP 5
        // BUILD GROQ PROMPT
        // ====================================================

        const prompt = `
You are the Legal Research AI Agent for Nyaya AI.

Your task is to identify applicable Indian laws using the
retrieved legal sources provided below.

IMPORTANT RULES:

1. Use the retrieved legal sources as the primary legal
   authority.

2. If the user explicitly names an Act abbreviation and
   section number, such as BNS, BNSS, or BSA, preserve
   that exact Act and section reference.

3. Do NOT reinterpret BSA, BNS, or BNSS as another law.

4. Do NOT substitute a provision from another Act when
   an explicit Act and section has been requested.

5. If an explicit Act and section was requested and the
   requested provision cannot be verified from the
   retrieved material, clearly say that it could not be
   verified.

6. Do NOT invent Acts, sections, punishments, legal
   provisions, citations, or statutory text.

7. Do NOT assume that a section applies merely because
   a keyword appears.

8. If the retrieved material is insufficient, explicitly
   state that the available evidence is insufficient.

9. Distinguish the statutory text from your interpretation.

10. Mention the exact Act and section number when supported
    by the retrieved source.

11. Do not treat case-law summaries as the text of a statute.

12. Do not claim that a punishment exists unless the
    retrieved legal material actually supports it.

13. If the retrieved text is truncated, do not reconstruct
    the missing portion from memory.

14. Prefer the most directly relevant retrieved provision.

15. Keep the final answer concise and grounded in the
    retrieved sources.

CASE DESCRIPTION:

${caseDescription}


RETRIEVED LEGAL SOURCES:

${legalContext}


RETURN:

1. Applicable Indian laws
2. Relevant Acts
3. Relevant Sections
4. Maximum punishment, only if directly supported by the
   retrieved legal material
5. Brief reasoning based on the retrieved text

Do not provide unsupported legal conclusions.
`;


        // ====================================================
        // STEP 6
        // CALL GROQ
        // ====================================================

        const result =
            await askAI(prompt);


        return result;


    } catch (err) {

        // ====================================================
        // ERROR HANDLING
        // ====================================================

        console.error(
            "LAW RESEARCH AGENT ERROR:",
            err
        );


        // Specific handling for model context/token errors

        const errorMessage =
            err?.message ||
            err?.error?.message ||
            "";


        if (
            errorMessage.toLowerCase().includes("too large") ||
            errorMessage.toLowerCase().includes("tokens") ||
            errorMessage.toLowerCase().includes("rate_limit")
        ) {

            console.error(
                "LAW RESEARCH AGENT: Model context/token limit reached."
            );

            return (
                "The legal research request retrieved too much material " +
                "for the AI model to process in one request. Please try " +
                "a more specific legal question or provide an Act and " +
                "section number."
            );
        }


        return "Unable to research applicable laws.";
    }
}


// ============================================================
// EXPORT
// ============================================================

module.exports = lawResearchAgent;