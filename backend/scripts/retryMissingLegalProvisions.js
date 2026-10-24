const crypto = require("crypto");
const db = require("../db");

const API_BASE = "https://indiacode.ecourtsindia.com/api/v1";

const ACT_CONCURRENCY = 2;
const SECTION_CONCURRENCY = 5;
const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 3;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(path, attempt = 1) {
    const url = `${API_BASE}${path}`;

    try {
        const controller = new AbortController();

        const timeout = setTimeout(
            () => controller.abort(),
            REQUEST_TIMEOUT_MS
        );

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                Accept: "application/json"
            }
        });

        clearTimeout(timeout);

        if (!response.ok) {
            const body = await response
                .text()
                .catch(() => "");

            throw new Error(
                `HTTP ${response.status} for ${url}: ${body.slice(0, 300)}`
            );
        }

        return await response.json();

    } catch (error) {
        if (attempt < MAX_RETRIES) {
            console.log(
                `Retrying request (${attempt + 1}/${MAX_RETRIES}): ${url}`
            );

            await sleep(1000 * attempt);

            return fetchJson(path, attempt + 1);
        }

        throw error;
    }
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

            try {
                results[index] = await worker(
                    items[index],
                    index
                );
            } catch (error) {
                results[index] = {
                    error
                };
            }
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

function sha256(value) {
    return crypto
        .createHash("sha256")
        .update(String(value || ""), "utf8")
        .digest("hex");
}

/**
 * India Code provision number.
 *
 * Examples:
 * 103
 * 124A
 * 43-B
 * 6A
 */
function getProvisionNumber(item) {
    return String(
        item?.number ??
        item?.section_number ??
        item?.sectionNumber ??
        item?.article_number ??
        item?.articleNumber ??
        ""
    ).trim();
}

/**
 * /acts/{act} returns:
 *
 * {
 *   act: {...},
 *   sections: [...]
 * }
 *
 * Constitution/articles can use articles.
 */
function getProvisionList(actData) {
    return (
        actData?.sections ||
        actData?.articles ||
        actData?.provisions ||
        actData?.units ||
        []
    );
}

/**
 * Prefer the unit declared by India Code.
 */
function getUnitType(actData) {
    const unit = String(
        actData?.act?.unit ||
        ""
    ).toLowerCase();

    if (unit === "article") {
        return "article";
    }

    if (unit === "rule") {
        return "rule";
    }

    return "section";
}

/**
 * Individual provision response:
 *
 * {
 *   act: {...},
 *   section: {
 *      number,
 *      heading,
 *      text
 *   }
 * }
 *
 * Articles use `article`.
 */
function getProvisionTitle(data) {
    return String(
        data?.section?.heading ??
        data?.article?.heading ??
        data?.rule?.heading ??
        data?.heading ??
        data?.title ??
        data?.section_title ??
        data?.sectionTitle ??
        data?.article_title ??
        ""
    ).trim();
}

function getProvisionContent(data) {
    return String(
        data?.section?.text ??
        data?.article?.text ??
        data?.rule?.text ??
        data?.text ??
        data?.content ??
        data?.body ??
        data?.section_text ??
        data?.article_text ??
        ""
    ).trim();
}

async function getCentralActs() {
    const data = await fetchJson(
        "/acts?jurisdiction=central&limit=1000"
    );

    return Array.isArray(data)
        ? data
        : data?.acts ||
          data?.data ||
          [];
}

async function getActDetails(act) {
    return fetchJson(
        `/acts/${encodeURIComponent(act.id)}`
    );
}

/**
 * IMPORTANT:
 *
 * Correct India Code API:
 *
 * /{act}/section/{number}
 * /{act}/article/{number}
 *
 * NOT:
 *
 * /acts/{act}/section/{number}
 */
async function getProvisionDetails(
    actId,
    number,
    type
) {
    let endpoint;

    if (type === "article") {
        endpoint =
            `/${encodeURIComponent(actId)}/article/${encodeURIComponent(number)}`;
    } else if (type === "rule") {
        endpoint =
            `/${encodeURIComponent(actId)}/rule/${encodeURIComponent(number)}`;
    } else {
        endpoint =
            `/${encodeURIComponent(actId)}/section/${encodeURIComponent(number)}`;
    }

    return fetchJson(endpoint);
}

async function getExistingNumbers(actName) {
    const [rows] = await db.query(
        `
        SELECT section_number
        FROM legal_knowledge
        WHERE act_name = ?
        `,
        [actName]
    );

    return new Set(
        rows
            .map((row) =>
                String(row.section_number).trim()
            )
            .filter(Boolean)
    );
}

async function insertProvision(row) {
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            section_title = VALUES(section_title),
            content = VALUES(content),
            source_name = VALUES(source_name),
            source_url = VALUES(source_url),
            effective_date = VALUES(effective_date),
            source_version = VALUES(source_version),
            content_hash = VALUES(content_hash)
        `,
        [
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
        ]
    );
}

async function processAct(act) {
    const actData = await getActDetails(act);

    /**
     * India Code /acts/{act} response:
     *
     * {
     *   act: {
     *      id,
     *      short_title,
     *      act_number,
     *      act_year,
     *      unit,
     *      ...
     *   },
     *   sections: [...]
     * }
     */
    const actInfo = actData?.act || {};

    const actName = String(
        actInfo?.short_title ??
        act?.short_title ??
        act?.name ??
        ""
    ).trim();

    const actNumber = String(
        actInfo?.act_number ??
        act?.act_number ??
        act?.number ??
        ""
    ).trim();

    if (!actName) {
        throw new Error(
            `Could not determine act name for ${act.id}`
        );
    }

    const provisions = getProvisionList(actData);

    const type = getUnitType(actData);

    const existing = await getExistingNumbers(
        actName
    );

    const missing = provisions.filter((item) => {
        const number = getProvisionNumber(item);

        return (
            number &&
            !existing.has(number)
        );
    });

    console.log(
        `${actName}: expected=${provisions.length}, existing=${existing.size}, missing=${missing.length}`
    );

    if (missing.length === 0) {
        return {
            act: actName,
            missing: 0,
            inserted: 0,
            failed: 0
        };
    }

    let inserted = 0;
    let failed = 0;

    await mapConcurrent(
        missing,
        SECTION_CONCURRENCY,
        async (item) => {
            const number =
                getProvisionNumber(item);

            try {
                const data =
                    await getProvisionDetails(
                        act.id,
                        number,
                        type
                    );

                const content =
                    getProvisionContent(data);

                const title =
                    getProvisionTitle(data);

                if (!content) {
                    throw new Error(
                        `Empty content for ${actName} ${type} ${number}`
                    );
                }

                const responseAct =
                    data?.act || {};

                await insertProvision({
                    act_name: actName,

                    act_number:
                        actNumber || null,

                    section_number: number,

                    section_title:
                        title || null,

                    content,

                    source_name:
                        data?.source_name ||
                        responseAct?.source_name ||
                        actInfo?.source_name ||
                        "India Code / eCourtsIndia",

                    source_url:
                        data?.source_url ||
                        data?.url ||
                        responseAct?.url ||
                        actInfo?.url ||
                        null,

                    effective_date:
                        data?.effective_date ||
                        responseAct?.effective_date ||
                        actInfo?.effective_date ||
                        null,

                    source_version:
                        data?.source_version ||
                        responseAct?.act_year ||
                        actInfo?.act_year ||
                        null,

                    content_hash:
                        sha256(content)
                });

                inserted++;

                console.log(
                    `${actName}: recovered ${number}`
                );

            } catch (error) {
                failed++;

                console.error(
                    `${actName}: FAILED ${number}: ${error.message}`
                );
            }
        }
    );

    return {
        act: actName,
        missing: missing.length,
        inserted,
        failed
    };
}

async function main() {
    console.log(
        "=============================================="
    );

    console.log(
        "NYAYA AI — RETRY MISSING LEGAL PROVISIONS"
    );

    console.log(
        "=============================================="
    );

    const acts =
        await getCentralActs();

    const inForceActs =
        acts.filter(
            (act) =>
                act?.in_force === true ||
                act?.in_force === 1 ||
                act?.in_force === "true" ||
                act?.in_force === "1"
        );

    console.log(
        `Central Acts found: ${acts.length}`
    );

    console.log(
        `In-force Acts: ${inForceActs.length}`
    );

    console.log("");

    let totalMissing = 0;
    let totalInserted = 0;
    let totalFailed = 0;

    const results =
        await mapConcurrent(
            inForceActs,
            ACT_CONCURRENCY,
            async (act, index) => {
                try {
                    const result =
                        await processAct(act);

                    console.log(
                        `PROGRESS: ${index + 1}/${inForceActs.length}`
                    );

                    return result;

                } catch (error) {
                    console.error(
                        `ACT FAILED: ${act?.id}: ${error.message}`
                    );

                    return {
                        act:
                            act?.short_title ||
                            act?.name ||
                            act?.id,

                        missing: 0,

                        inserted: 0,

                        failed: 1
                    };
                }
            }
        );

    for (const result of results) {
        if (!result) {
            continue;
        }

        totalMissing +=
            result.missing || 0;

        totalInserted +=
            result.inserted || 0;

        totalFailed +=
            result.failed || 0;
    }

    console.log("");

    console.log(
        "=============================================="
    );

    console.log(
        "RETRY COMPLETE"
    );

    console.log(
        "=============================================="
    );

    console.log(
        `Missing provisions detected: ${totalMissing}`
    );

    console.log(
        `Recovered/inserted:          ${totalInserted}`
    );

    console.log(
        `Still failed:                ${totalFailed}`
    );

    console.log(
        "=============================================="
    );

    if (typeof db.end === "function") {
        await db.end();
    }
}

main().catch(async (error) => {
    console.error("");

    console.error(
        "RETRY FAILED:"
    );

    console.error(error);

    try {
        if (typeof db.end === "function") {
            await db.end();
        }
    } catch {}

    process.exit(1);
});