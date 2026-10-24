const API_BASE = "https://indiacode.ecourtsindia.com/api/v1";

async function fetchJson(url) {
    const response = await fetch(url);
    const text = await response.text();

    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status}\n${text}`
        );
    }

    return JSON.parse(text);
}

async function main() {
    // BNSS Section 478
    const url =
        `${API_BASE}/bnss/section/478`;

    console.log("Fetching section...");
    console.log(url);

    const data = await fetchJson(url);

    console.log("\n========== RESPONSE KEYS ==========\n");
    console.log(Object.keys(data));

    console.log("\n========== SECTION DATA ==========\n");
    console.log(
        JSON.stringify(data, null, 2)
    );

    console.log("\n========== TEST COMPLETE ==========\n");
}

main().catch(error => {
    console.error("\n❌ TEST FAILED");
    console.error(error.message);
    process.exitCode = 1;
});