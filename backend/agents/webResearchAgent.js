const { tinyFishSearch } = require("../services/tinyfishService");

/**
 * Performs live web research for a legal question.
 *
 * This is the first layer between Nyaya AI's
 * legal research system and TinyFish.
 */
async function webResearchAgent({ query }) {
  if (!query || typeof query !== "string") {
    throw new Error("A valid research query is required.");
  }

  const searchResult = await tinyFishSearch(query);

  return {
    provider: "tinyfish",
    query,
    results: searchResult,
  };
}

module.exports = {
  webResearchAgent,
};