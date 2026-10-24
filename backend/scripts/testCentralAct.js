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
    console.log("Finding BNS in Central Acts...\n");

    const data = await fetchJson(
        `${API_BASE}/acts?jurisdiction=central&limit=1000`
    );

    const acts = data.acts || [];

    const matches = acts.filter(act => {
        const text = [
            act.id,
            act.short_title,
            act.long_title
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return (
            text.includes("bharatiya nyaya") ||
            text.includes("bns")
        );
    });

    console.log(`Found ${matches.length} matching Act(s):\n`);

    for (const act of matches) {
        console.log(
            JSON.stringify(
                {
                    id: act.id,
                    short_title: act.short_title,
                    act_number: act.act_number,
                    act_year: act.act_year,
                    section_count: act.section_count,
                    in_force: act.in_force,
                    enforcement_date: act.enforcement_date,
                    url: act.url
                },
                null,
                2
            )
        );
    }

    if (matches.length === 0) {
        console.log(
            "BNS was not found in the Central Acts response."
        );
        return;
    }

    const act = matches[0];

    console.log("\n================================");
    console.log("TESTING ACT ID");
    console.log("================================\n");

    console.log(act.id);

    const actUrl =
        `${API_BASE}/acts/${encodeURIComponent(act.id)}`;

    console.log(`\nFetching:\n${actUrl}\n`);

    const actData = await fetchJson(actUrl);

    console.log("========== ACT RESPONSE ==========\n");

    console.log(
        JSON.stringify(actData, null, 2)
    );
}

main().catch(error => {
    console.error("\n❌ TEST FAILED");
    console.error(error.message);
    process.exitCode = 1;
});