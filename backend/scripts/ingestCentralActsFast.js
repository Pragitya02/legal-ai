const crypto = require("crypto");
const db = require("../db");
const { ensureLegalKnowledgeTable } = require("../database/legalKnowledgeModel");

const API_BASE = "https://indiacode.ecourtsindia.com/api/v1";

const ACT_CONCURRENCY = 2;
const SECTION_CONCURRENCY = 5;
const DB_BATCH_SIZE = 100;
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJson(url, attempt = 1) {
    let response;

    try {
        const controller = new AbortController();
        const timer = setTimeout(
            () => controller.abort(),
            REQUEST_TIMEOUT_MS
        );

        response = await fetch(url, {
            signal: controller.signal,
            headers: {
                Accept: "application/json",
                "User-Agent": "Nyaya-AI-Legal-Ingestion/1.0"
            }
        });

        clearTimeout(timer);
    } catch (error) {
        if (attempt < MAX_RETRIES) {
            console.log(
                `Retrying request (${attempt}/${MAX_RETRIES}): ${url}`
            );

            await sleep(attempt * 1000);

            return fetchJson(url, attempt + 1);
        }

        throw error;
    }

    if (!response.ok) {
        const body = await response.text();

        if (attempt < MAX_RETRIES && response.status >= 500) {
            console.log(
                `HTTP ${response.status}. Retrying (${attempt}/${MAX_RETRIES})`
            );

            await sleep(attempt * 1000);

            return fetchJson(url, attempt + 1);
        }

        throw new Error(
            `HTTP ${response.status} for ${url}: ${body.slice(0, 300)}`
        );
    }

    return response.json();
}

async function mapConcurrent(items, concurrency, worker) {
    const results = new Array(items.length);
    let nextIndex = 0;

    async function runner() {
        while (true) {
            const index = nextIndex++;

            if (index >= items.length) {
                return;
            }

            results[index] = await worker(items[index], index);
        }
    }

    const workers = Array.from(
        {
            length: Math.min(concurrency, items.length)
        },
        () => runner()
    );

    await Promise.all(workers);

    return results;
}

async function getCentralActs() {
    console.log("Fetching Central Acts...");

    const url =
        `${API_BASE}/acts?jurisdiction=central&limit=1000`;

    const data = await fetchJson(url);

    return data.acts || [];
}

function getActName(actData, fallback) {
    return (
        actData?.act?.short_title ||
        actData?.short_title ||
        fallback
    );
}

function getActNumber(actData) {
    return (
        actData?.act?.act_number ||
        actData?.act_number ||
        null
    );
}

function getActYear(actData) {
    return (
        actData?.act?.act_year ||
        actData?.act_year ||
        null
    );
}

function getActUnit(actData, fallback) {
    return (
        actData?.act?.unit ||
        actData?.unit ||
        fallback ||
        "section"
    );
}

function getProvisionList(actData, unit) {
    if (unit === "article") {
        return (
            actData?.articles ||
            actData?.sections ||
            []
        );
    }

    return (
        actData?.sections ||
        []
    );
}

function getProvisionPayload(detail, unit) {
    if (unit === "article") {
        return (
            detail?.article ||
            detail?.section ||
            detail
        );
    }

    return (
        detail?.section ||
        detail
    );
}

async function fetchProvision(actId, number, unit) {
    const encodedNumber = encodeURIComponent(number);

    const endpointUnit =
        unit === "article"
            ? "article"
            : "section";

    const url =
        `${API_BASE}/${encodeURIComponent(actId)}/${endpointUnit}/${encodedNumber}`;

    const data = await fetchJson(url);

    return getProvisionPayload(data, unit);
}

function buildRow({
    act,
    actData,
    provision,
    detail,
    unit
}) {
    const number =
        provision?.number ||
        provision?.section_number ||
        provision?.article_number ||
        provision?.id;

    const heading =
        detail?.heading ||
        detail?.title ||
        provision?.heading ||
        null;

    const text =
        detail?.text ||
        detail?.body ||
        detail?.content ||
        "";

    if (!number || !text.trim()) {
        return null;
    }

    const actName = getActName(actData, act.short_title);

    const content = `${number}. ${text}`.trim();

    return {
        act_name: actName,
        act_number: getActNumber(actData),
        section_number: String(number),
        section_title: heading,
        content,
        source_name: "India Code / eCourtsIndia",
        source_url:
            detail?.url ||
            provision?.url ||
            actData?.act?.url ||
            act.url ||
            null,
        effective_date: null,
        source_version:
            getActYear(actData)
                ? String(getActYear(actData))
                : null,
        content_hash: crypto
            .createHash("sha256")
            .update(content, "utf8")
            .digest("hex")
    };
}

async function saveRows(rows, actName) {
    if (!rows.length) {
        return {
            inserted: 0,
            updated: 0,
            skipped: 0
        };
    }

    const [existingRows] = await db.query(
        `
        SELECT
            section_number,
            content_hash
        FROM legal_knowledge
        WHERE act_name = ?
        `,
        [actName]
    );

    const existing = new Map(
        existingRows.map(row => [
            String(row.section_number),
            row.content_hash
        ])
    );

    const newRows = [];
    const changedRows = [];
    let skipped = 0;

    for (const row of rows) {
        const oldHash = existing.get(
            String(row.section_number)
        );

        if (!oldHash) {
            newRows.push(row);
        } else if (oldHash !== row.content_hash) {
            changedRows.push(row);
        } else {
            skipped++;
        }
    }

    const rowsToWrite = [
        ...newRows,
        ...changedRows
    ];

    for (
        let start = 0;
        start < rowsToWrite.length;
        start += DB_BATCH_SIZE
    ) {
        const batch = rowsToWrite.slice(
            start,
            start + DB_BATCH_SIZE
        );

        const values = batch.map(row => [
            row.act_name,
            row.act_number,
            row.section_number,
            row.section_title,
            row.content,
            row.source_name,
            row.source_url,
            row.effective_date,
            row.source_version,
            row.content_hash
        ]);

        await db.query(
            `
            INSERT INTO legal_knowledge (
                act_name,
                act_number,
                section_number,
                section_title,
                content,
                source_name,
                source_url,
                effective_date,
                source_version,
                content_hash
            )
            VALUES ?
            ON DUPLICATE KEY UPDATE
                act_number = VALUES(act_number),
                section_title = VALUES(section_title),
                content = VALUES(content),
                source_name = VALUES(source_name),
                source_url = VALUES(source_url),
                effective_date = VALUES(effective_date),
                source_version = VALUES(source_version),
                content_hash = VALUES(content_hash)
            `,
            [values]
        );
    }

    return {
        inserted: newRows.length,
        updated: changedRows.length,
        skipped
    };
}

async function ingestAct(act) {
    console.log(
        `\nACT: ${act.short_title}`
    );

    console.log(
        `ID: ${act.id}`
    );

    console.log(
        `Expected provisions: ${act.section_count || "unknown"}`
    );

    const actData = await fetchJson(
        `${API_BASE}/acts/${encodeURIComponent(act.id)}`
    );

    const unit = getActUnit(
        actData,
        act.unit
    );

    const provisions =
        getProvisionList(
            actData,
            unit
        );

    console.log(
        `Unit: ${unit}`
    );

    console.log(
        `API returned ${provisions.length} provisions.`
    );

    if (!provisions.length) {
        console.log(
            `SKIPPED: No provisions returned for ${act.id}`
        );

        return {
            inserted: 0,
            updated: 0,
            skipped: 0,
            failed: 0,
            provisions: 0
        };
    }

    const detailed = await mapConcurrent(
        provisions,
        SECTION_CONCURRENCY,
        async (provision, index) => {
            try {
                const number =
                    provision.number ||
                    provision.section_number ||
                    provision.article_number ||
                    provision.id;

                const detail = await fetchProvision(
                    act.id,
                    String(number),
                    unit
                );

                if (
                    (index + 1) % 25 === 0 ||
                    index === provisions.length - 1
                ) {
                    console.log(
                        `${act.id}: fetched ${index + 1}/${provisions.length}`
                    );
                }

                return buildRow({
                    act,
                    actData,
                    provision,
                    detail,
                    unit
                });
            } catch (error) {
                console.error(
                    `FAILED ${act.id} provision ${
                        provision.number || "unknown"
                    }: ${error.message}`
                );

                return null;
            }
        }
    );

    const rows = detailed.filter(Boolean);

    const result = await saveRows(
        rows,
        getActName(actData, act.short_title)
    );

    console.log(
        `COMPLETED ${act.id}: ` +
        `inserted=${result.inserted}, ` +
        `updated=${result.updated}, ` +
        `skipped=${result.skipped}, ` +
        `failed=${provisions.length - rows.length}`
    );

    return {
        ...result,
        failed: provisions.length - rows.length,
        provisions: provisions.length
    };
}

function parseArgs() {
    const args = process.argv.slice(2);

    const result = {
        all: false,
        acts: null,
        offset: null,
        limit: null
    };

    for (const arg of args) {
        if (arg === "--all") {
            result.all = true;
        } else if (arg.startsWith("--acts=")) {
            result.acts = arg
                .slice("--acts=".length)
                .split(",")
                .map(x => x.trim())
                .filter(Boolean);
        } else if (arg.startsWith("--offset=")) {
            result.offset = Number(
                arg.slice("--offset=".length)
            );
        } else if (arg.startsWith("--limit=")) {
            result.limit = Number(
                arg.slice("--limit=".length)
            );
        }
    }

    return result;
}

async function main() {
    console.log(`
========================================
NYAYA AI — OPTIMIZED CENTRAL ACTS INGESTION
========================================
`);

    const args = parseArgs();

    if (
        !args.all &&
        !args.acts &&
        args.offset === null
    ) {
        throw new Error(
            "No ingestion scope specified. Use --all, --acts=..., or --offset=..."
        );
    }

    await ensureLegalKnowledgeTable(db);

    const allActs = await getCentralActs();

    console.log(
        `Found ${allActs.length} Central Acts.`
    );

    let selectedActs = allActs.filter(
        act =>
            act.in_force === true ||
            act.in_force === 1
    );

    if (args.acts) {
        const allowed = new Set(args.acts);

        selectedActs = selectedActs.filter(
            act => allowed.has(act.id)
        );
    } else if (
        args.offset !== null ||
        args.limit !== null
    ) {
        const offset = Math.max(
            0,
            args.offset || 0
        );

        const limit =
            args.limit === null
                ? selectedActs.length - offset
                : Math.max(0, args.limit);

        selectedActs =
            selectedActs.slice(
                offset,
                offset + limit
            );
    }

    if (args.all) {
        console.log(
            "WARNING: Processing ALL in-force Central Acts."
        );
    }

    console.log(
        `Acts selected for ingestion: ${selectedActs.length}`
    );

    let totals = {
        acts: 0,
        provisions: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        failed: 0
    };

    await mapConcurrent(
        selectedActs,
        ACT_CONCURRENCY,
        async (act, index) => {
            try {
                const result =
                    await ingestAct(act);

                totals.acts++;
                totals.provisions +=
                    result.provisions;
                totals.inserted +=
                    result.inserted;
                totals.updated +=
                    result.updated;
                totals.skipped +=
                    result.skipped;
                totals.failed +=
                    result.failed;

                console.log(
                    `\nPROGRESS: ${
                        index + 1
                    }/${selectedActs.length} acts processed`
                );
            } catch (error) {
                totals.acts++;

                console.error(
                    `ACT FAILED: ${act.id}`,
                    error.message
                );
            }
        }
    );

    console.log(`
========================================
INGESTION COMPLETE
========================================
Acts processed: ${totals.acts}
Provisions seen: ${totals.provisions}
Inserted: ${totals.inserted}
Updated: ${totals.updated}
Skipped: ${totals.skipped}
Failed provisions: ${totals.failed}
========================================
`);
}

main()
    .catch(error => {
        console.error(
            "\n❌ INGESTION FAILED"
        );
        console.error(error);
        process.exitCode = 1;
    });