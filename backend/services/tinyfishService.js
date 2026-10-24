const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY;

if (!TINYFISH_API_KEY) {
    console.warn(
        "TINYFISH_API_KEY is not configured. TinyFish features will be unavailable."
    );
}

/**
 * Search the live web using TinyFish Search API.
 */
async function tinyFishSearch(query) {
    if (!TINYFISH_API_KEY) {
        throw new Error("TinyFish API key is not configured.");
    }

    if (!query || typeof query !== "string") {
        throw new Error("A valid search query is required.");
    }

    const url = new URL(
        "https://api.search.tinyfish.ai"
    );

    url.searchParams.set("query", query);

    const response = await fetch(url, {
        method: "GET",
        headers: {
            "X-API-Key": TINYFISH_API_KEY,
        },
    });

    if (!response.ok) {
        const errorText = await response.text();

        throw new Error(
            `TinyFish Search failed (${response.status}): ${errorText}`
        );
    }

    return await response.json();
}

module.exports = {
    tinyFishSearch,
};