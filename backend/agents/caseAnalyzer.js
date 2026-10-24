const askAI = require("../services/groqService");

async function caseAnalyzer(userCase) {

    const prompt = `
You are an expert legal case analyzer.

Analyze the following legal issue.

Case:
${userCase}

IMPORTANT REFERENCE-PRESERVATION RULE:

If the user's input contains an explicit legal reference such as
"Section 63 of BSA", "Section 103 BNS", or "Section 478 BNSS",
preserve that exact Act abbreviation and section number.

Do NOT reinterpret BSA, BNS, or BNSS as an unrelated foreign law,
organization, statute, or acronym.

If the input is simply asking what a specific section means,
describe the query as a legal research question rather than
inventing a crime category, victim/accused relationship, or
case facts that were not provided.

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