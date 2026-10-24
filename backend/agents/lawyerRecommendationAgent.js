const { getAllLawyers } = require("../database/lawyerModel");

async function lawyerRecommendationAgent(caseDescription) {

    let specialization = "General Civil Law";

    const text = caseDescription.toLowerCase();

    if (
        text.includes("theft") ||
        text.includes("murder") ||
        text.includes("assault") ||
        text.includes("crime")
    ) {
        specialization = "Criminal Law";
    }

    else if (
        text.includes("property") ||
        text.includes("land") ||
        text.includes("rent")
    ) {
        specialization = "Property Law";
    }

    else if (text.includes("consumer")) {
        specialization = "Consumer Law";
    }

    else if (
        text.includes("divorce") ||
        text.includes("marriage")
    ) {
        specialization = "Family Law";
    }

    // Fetch all lawyers from database
    const lawyers = await getAllLawyers();

    // Filter only matching lawyers
    const recommendedLawyers = lawyers.filter(
        lawyer => lawyer.specialization === specialization
    );

    return {
        specialization,
        lawyers: recommendedLawyers
    };
}

module.exports = lawyerRecommendationAgent;