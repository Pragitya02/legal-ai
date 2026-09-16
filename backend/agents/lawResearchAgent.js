const askAI = require("../services/groqService");

async function lawResearchAgent(caseDescription) {
    try {

        const prompt = `
You are a Legal Research AI Agent.

Your ONLY responsibility is legal research.

Case:
${caseDescription}

Return ONLY:

1. Applicable Indian laws
2. Relevant Acts
3. Relevant Sections
4. Maximum punishment (if applicable)

Keep the answer short and structured.
`;

        const result = await askAI(prompt);

        return result;

    } catch (err) {

        console.error("LAW RESEARCH AGENT ERROR:", err);

        return "Unable to research applicable laws.";

    }
}

module.exports = lawResearchAgent;