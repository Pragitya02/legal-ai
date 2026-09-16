async function reportGeneratorAgent(caseAnalysis, lawResearch, lawyerRecommendation) {

    return `

==========================
NYAYA AI LEGAL REPORT
==========================

CASE ANALYSIS

${caseAnalysis}

--------------------------

LEGAL RESEARCH

${lawResearch}

--------------------------

LAWYER RECOMMENDATION

${lawyerRecommendation}

==========================

Thank you for using NyayaAI.

`;

}

module.exports = reportGeneratorAgent;