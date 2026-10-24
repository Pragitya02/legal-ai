const API_BASE = "https://indiacode.ecourtsindia.com/api/v1";

async function fetchJson(url) {
    const response = await fetch(url);

    const text = await response.text();

    if (!response.ok) {
        throw new Error(
            `HTTP ${response.status} while requesting ${url}\n${text}`
        );
    }

    return JSON.parse(text);
}

async function getCentralActs() {
    const allActs = [];

    // Use the documented API format.
    let url =
        `${API_BASE}/acts?jurisdiction=central&limit=1000`;

    while (url) {
        console.log(`Fetching: ${url}`);

        const data = await fetchJson(url);

        if (!Array.isArray(data.acts)) {
            throw new Error(
                "API response does not contain an acts array."
            );
        }

        allActs.push(...data.acts);

        console.log(
            `Received ${data.count} acts. Total collected: ${allActs.length}/${data.total}`
        );

        // The API provides the next URL.
        url = data.next || null;
    }

    return allActs;
}

function isInForce(value) {
    return (
        value === true ||
        value === 1 ||
        value === "1" ||
        value === "true"
    );
}

function printSummary(acts) {
    const inForce = acts.filter(
        act => isInForce(act.in_force)
    );

    const notInForce = acts.filter(
        act => !isInForce(act.in_force)
    );

    const totalSections = acts.reduce(
        (sum, act) =>
            sum + Number(act.section_count || 0),
        0
    );

    const inForceSections = inForce.reduce(
        (sum, act) =>
            sum + Number(act.section_count || 0),
        0
    );

    console.log("\n==========================================");
    console.log("CENTRAL ACT INSPECTION");
    console.log("==========================================");

    console.log(`Total Central Acts: ${acts.length}`);
    console.log(`In-force Central Acts: ${inForce.length}`);
    console.log(`Not-in-force Acts: ${notInForce.length}`);
    console.log(`Total provisions: ${totalSections}`);
    console.log(`In-force provisions: ${inForceSections}`);

    console.log("\n==========================================");
    console.log("FIRST 30 CENTRAL ACTS");
    console.log("==========================================\n");

    acts.slice(0, 30).forEach((act, index) => {
        console.log(
            `${index + 1}. ` +
            `${act.short_title || "Unknown"} | ` +
            `ID: ${act.id || "N/A"} | ` +
            `Act ${act.act_number || "N/A"} of ${act.act_year || "N/A"} | ` +
            `Sections: ${act.section_count || 0} | ` +
            `In force: ${act.in_force}`
        );
    });

    console.log("\n==========================================");
    console.log("SAMPLE ACT");
    console.log("==========================================\n");

    console.log(
        JSON.stringify(acts[0], null, 2)
    );

    console.log("\n==========================================");
    console.log("INSPECTION COMPLETE");
    console.log("NO DATABASE CHANGES WERE MADE.");
    console.log("==========================================");
}

async function main() {
    try {
        console.log("==========================================");
        console.log("NYAYA AI - CENTRAL ACT INSPECTION");
        console.log("==========================================\n");

        const acts = await getCentralActs();

        if (acts.length === 0) {
            throw new Error(
                "No Central Acts were returned."
            );
        }

        printSummary(acts);

    } catch (error) {
        console.error("\n❌ INSPECTION FAILED");
        console.error(error.message);
        process.exitCode = 1;
    }
}

main();