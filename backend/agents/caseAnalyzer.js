const askAI = require("../services/groqService");

async function caseAnalyzer(userCase) {

    const prompt = `
You are an expert legal case analyzer.

Analyze the following legal issue.

Case:
${userCase}

Return ONLY the following:

Case Type:
Victim or Accused:
Crime Category:
Short Summary:
Possible Severity: Low / Medium / High
`;

    const result = await askAI(prompt);

    return result;
}

module.exports = caseAnalyzer;