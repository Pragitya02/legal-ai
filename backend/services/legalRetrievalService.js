const db = require("../db");

/*
 * ============================================================
 * NYAYA AI — LEGAL RETRIEVAL SERVICE
 * ============================================================
 *
 * Retrieval pipeline:
 *
 * 1. Detect explicit section references
 * 2. Detect Act references / aliases
 * 3. Try exact section retrieval
 * 4. Run MySQL natural-language FULLTEXT retrieval
 * 5. Run MySQL boolean FULLTEXT retrieval
 * 6. Apply deterministic legal terminology expansion
 * 7. Merge duplicate provisions
 * 8. Rank results
 * 9. Return structured legal evidence
 *
 * IMPORTANT:
 * If an Act is explicitly detected, natural-language retrieval
 * is constrained to that Act at the SQL level.
 *
 * This prevents queries such as:
 *
 * "requirements for admitting electronic records under BSA"
 *
 * from returning unrelated provisions from:
 * - Income-tax Rules
 * - Information Technology Act
 * - Public Records Act
 * - other Acts
 *
 * This service DOES NOT generate legal conclusions.
 * It only retrieves legal provisions from the database.
 *
 * ============================================================
 */


/* ============================================================
 * CONFIGURATION
 * ============================================================
 */

const DEFAULT_LIMIT = 8;

const MAX_QUERY_LENGTH = 2000;

const NATURAL_FETCH_MULTIPLIER = 3;

const BOOLEAN_FETCH_MULTIPLIER = 3;


/* ============================================================
 * ACT ALIASES
 * ============================================================
 */

const ACT_ALIASES = [

    {
        aliases: [
            "bns",
            "bharatiya nyaya sanhita",
            "bharatiya nyay sanhita"
        ],
        actName:
            "The Bharatiya Nyaya Sanhita, 2023"
    },

    {
        aliases: [
            "bnss",
            "bharatiya nagarik suraksha sanhita",
            "bharatiya nagrik suraksha sanhita"
        ],
        actName:
            "The Bharatiya Nagarik Suraksha Sanhita, 2023"
    },

    {
        aliases: [
            "bsa",
            "bharatiya sakshya adhiniyam",
            "bharatiya sakshya act"
        ],
        actName:
            "The Bharatiya Sakshya Adhiniyam, 2023"
    },

    {
        aliases: [
            "ipc",
            "indian penal code"
        ],
        actName:
            "The Indian Penal Code, 1860"
    },

    {
        aliases: [
            "crpc",
            "criminal procedure code",
            "code of criminal procedure"
        ],
        actName:
            "The Code of Criminal Procedure, 1973"
    },

    {
        aliases: [
            "indian evidence act",
            "evidence act"
        ],
        actName:
            "The Indian Evidence Act, 1872"
    }

];


/* ============================================================
 * COMMON LEGAL TERM EXPANSION
 * ============================================================
 */

const LEGAL_TERM_EXPANSIONS = {

    cheating: [
        "cheating",
        "dishonestly",
        "fraudulently",
        "deception"
    ],

    fraud: [
        "fraud",
        "cheating",
        "dishonestly",
        "deception"
    ],

    theft: [
        "theft",
        "dishonestly",
        "movable",
        "property"
    ],

    murder: [
        "murder",
        "death",
        "intention",
        "culpable"
    ],

    assault: [
        "assault",
        "criminal force",
        "hurt"
    ],

    defamation: [
        "defamation",
        "imputation",
        "reputation"
    ],

    rape: [
        "rape",
        "sexual",
        "intercourse"
    ],

    kidnapping: [
        "kidnapping",
        "abduction",
        "minor"
    ],

    bail: [
        "bail",
        "custody",
        "release",
        "bond"
    ],

    arrest: [
        "arrest",
        "custody",
        "police",
        "warrant"
    ],

    evidence: [
        "evidence",
        "proof",
        "document",
        "statement"
    ],

    contract: [
        "contract",
        "agreement",
        "promise",
        "consideration"
    ],

    punishment: [
        "punishment",
        "imprisonment",
        "fine",
        "penalty"
    ]

};


/* ============================================================
 * NORMALIZE QUERY
 * ============================================================
 */

function normalizeQuery(query) {

    return String(query || "")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, MAX_QUERY_LENGTH);

}


/* ============================================================
 * EXTRACT SECTION NUMBER
 * ============================================================
 *
 * Supports:
 *
 * Section 302
 * section 302A
 * Section 125(1)
 * Section 36A
 * Sec. 302
 * Sec 302
 *
 * ============================================================
 */

function extractSectionNumber(query) {

    const normalized =
        normalizeQuery(query);

    const match =
        normalized.match(
            /\b(?:section|sec\.?)\s+(\d+[A-Za-z]?(?:\([A-Za-z0-9]+\))?)\b/i
        );

    return match
        ? match[1]
        : null;

}


/* ============================================================
 * EXTRACT ACT
 * ============================================================
 */

function detectAct(query) {

    const normalized =
        normalizeQuery(query).toLowerCase();

    /*
     * Check longer aliases first.
     *
     * This prevents "bns" from being detected inside
     * "bnss".
     */

    const aliases =
        [...ACT_ALIASES]
            .sort(
                (a, b) =>
                    Math.max(...b.aliases.map(x => x.length)) -
                    Math.max(...a.aliases.map(x => x.length))
            );

    for (const entry of aliases) {

        for (const alias of entry.aliases) {

            const escapedAlias =
                alias.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                );

            const pattern =
                new RegExp(
                    `\\b${escapedAlias}\\b`,
                    "i"
                );

            if (
                pattern.test(normalized)
            ) {

                return {
                    actName:
                        entry.actName,

                    alias:
                        alias
                };

            }

        }

    }

    return null;

}


/* ============================================================
 * LEGAL QUERY EXPANSION
 * ============================================================
 */

function expandLegalTerms(query) {

    const normalized =
        normalizeQuery(query)
            .toLowerCase();

    const tokens =
        normalized
            .replace(/[^\w\s]/g, " ")
            .split(/\s+/)
            .filter(Boolean);

    const expanded = new Set(tokens);

    for (const token of tokens) {

        const expansion =
            LEGAL_TERM_EXPANSIONS[token];

        if (!expansion) {
            continue;
        }

        for (const term of expansion) {
            expanded.add(term);
        }

    }

    return Array.from(expanded)
        .join(" ");

}


/* ============================================================
 * BUILD BOOLEAN QUERY
 * ============================================================
 */

function buildBooleanQuery(query) {

    const expanded =
        expandLegalTerms(query);

    const tokens =
        expanded
            .split(/\s+/)
            .map(
                token =>
                    token.replace(
                        /[^\p{L}\p{N}]/gu,
                        ""
                    )
            )
            .filter(
                token =>
                    token.length >= 3
            );

    /*
     * Remove duplicate tokens.
     */

    const unique =
        Array.from(
            new Set(tokens)
        );

    /*
     * Limit query size.
     */

    return unique
        .slice(0, 40)
        .join(" ");

}


/* ============================================================
 * EXACT SECTION RETRIEVAL
 * ============================================================
 */

async function retrieveExactSection(
    sectionNumber,
    actName = null
) {

    try {

        let sql;

        let params;

        if (actName) {

            sql = `
                SELECT
                    id,
                    act_name,
                    act_number,
                    section_number,
                    section_title,
                    content,
                    source_name,
                    source_url,
                    effective_date,
                    source_version

                FROM legal_knowledge

                WHERE section_number = ?
                  AND act_name = ?

                LIMIT 1
            `;

            params = [
                sectionNumber,
                actName
            ];

        } else {

            sql = `
                SELECT
                    id,
                    act_name,
                    act_number,
                    section_number,
                    section_title,
                    content,
                    source_name,
                    source_url,
                    effective_date,
                    source_version

                FROM legal_knowledge

                WHERE section_number = ?

                ORDER BY
                    effective_date DESC,
                    id DESC

                LIMIT 5
            `;

            params = [
                sectionNumber
            ];

        }

        const [rows] =
            await db.query(
                sql,
                params
            );

        return rows.map(
            row => ({
                ...row,

                relevance: 1000,

                retrieval_type:
                    actName
                        ? "exact_section_act"
                        : "exact_section"
            })
        );

    } catch (error) {

        console.error(
            "LEGAL RAG EXACT SECTION ERROR:",
            error.message
        );

        return [];

    }

}


/* ============================================================
 * NATURAL LANGUAGE FULLTEXT RETRIEVAL
 * ============================================================
 *
 * IMPORTANT FIX:
 *
 * If actName is supplied, the SQL query contains:
 *
 *     AND act_name = ?
 *
 * Therefore unrelated Acts are never included in the
 * natural-language candidate set.
 *
 * ============================================================
 */

async function retrieveNaturalLanguage(
    query,
    fetchLimit,
    actName = null
) {

    try {

        let sql;

        let params;

        if (actName) {

            sql = `
                SELECT
                    id,
                    act_name,
                    act_number,
                    section_number,
                    section_title,
                    content,
                    source_name,
                    source_url,
                    effective_date,
                    source_version,

                    MATCH(section_title, content)
                    AGAINST (
                        ?
                        IN NATURAL LANGUAGE MODE
                    ) AS relevance

                FROM legal_knowledge

                WHERE MATCH(section_title, content)
                    AGAINST (
                        ?
                        IN NATURAL LANGUAGE MODE
                    )

                  AND act_name = ?

                ORDER BY relevance DESC

                LIMIT ?
            `;

            params = [
                query,
                query,
                actName,
                fetchLimit
            ];

        } else {

            sql = `
                SELECT
                    id,
                    act_name,
                    act_number,
                    section_number,
                    section_title,
                    content,
                    source_name,
                    source_url,
                    effective_date,
                    source_version,

                    MATCH(section_title, content)
                    AGAINST (
                        ?
                        IN NATURAL LANGUAGE MODE
                    ) AS relevance

                FROM legal_knowledge

                WHERE MATCH(section_title, content)
                    AGAINST (
                        ?
                        IN NATURAL LANGUAGE MODE
                    )

                ORDER BY relevance DESC

                LIMIT ?
            `;

            params = [
                query,
                query,
                fetchLimit
            ];

        }

        const [rows] =
            await db.query(
                sql,
                params
            );

        return rows.map(
            row => ({
                ...row,

                retrieval_type:
                    "fulltext_natural"
            })
        );

    } catch (error) {

        console.error(
            "LEGAL RAG NATURAL SEARCH ERROR:",
            error.message
        );

        return [];

    }

}


/* ============================================================
 * BOOLEAN FULLTEXT RETRIEVAL
 * ============================================================
 *
 * IMPORTANT FIX:
 *
 * If actName is supplied, the SQL query contains:
 *
 *     AND act_name = ?
 *
 * Therefore unrelated Acts are never included in the
 * boolean candidate set.
 *
 * ============================================================
 */

async function retrieveBoolean(
    query,
    fetchLimit,
    actName = null
) {

    const booleanQuery =
        buildBooleanQuery(query);

    if (!booleanQuery) {
        return [];
    }

    try {

        let sql;

        let params;

        if (actName) {

            sql = `
                SELECT
                    id,
                    act_name,
                    act_number,
                    section_number,
                    section_title,
                    content,
                    source_name,
                    source_url,
                    effective_date,
                    source_version,

                    MATCH(section_title, content)
                    AGAINST (
                        ?
                        IN BOOLEAN MODE
                    ) AS relevance

                FROM legal_knowledge

                WHERE MATCH(section_title, content)
                    AGAINST (
                        ?
                        IN BOOLEAN MODE
                    )

                  AND act_name = ?

                ORDER BY relevance DESC

                LIMIT ?
            `;

            params = [
                booleanQuery,
                booleanQuery,
                actName,
                fetchLimit
            ];

        } else {

            sql = `
                SELECT
                    id,
                    act_name,
                    act_number,
                    section_number,
                    section_title,
                    content,
                    source_name,
                    source_url,
                    effective_date,
                    source_version,

                    MATCH(section_title, content)
                    AGAINST (
                        ?
                        IN BOOLEAN MODE
                    ) AS relevance

                FROM legal_knowledge

                WHERE MATCH(section_title, content)
                    AGAINST (
                        ?
                        IN BOOLEAN MODE
                    )

                ORDER BY relevance DESC

                LIMIT ?
            `;

            params = [
                booleanQuery,
                booleanQuery,
                fetchLimit
            ];

        }

        const [rows] =
            await db.query(
                sql,
                params
            );

        return rows.map(
            row => ({
                ...row,

                retrieval_type:
                    "fulltext_boolean"
            })
        );

    } catch (error) {

        console.error(
            "LEGAL RAG BOOLEAN SEARCH ERROR:",
            error.message
        );

        return [];

    }

}


/* ============================================================
 * ACT FILTERING / METADATA
 * ============================================================
 *
 * At this point SQL retrieval has already been constrained when
 * an Act was detected.
 *
 * This function is retained as an additional deterministic
 * metadata/ranking layer.
 * ============================================================
 */

function applyActPreference(
    rows,
    detectedAct
) {

    if (!detectedAct) {
        return rows;
    }

    return rows.map(row => {

        const sameAct =
            String(row.act_name || "")
                .toLowerCase() ===
            detectedAct.actName.toLowerCase();

        return {
            ...row,

            act_match:
                sameAct,

            act_preference:
                sameAct
                    ? 1
                    : 0
        };

    });

}


/* ============================================================
 * NORMALIZE RELEVANCE
 * ============================================================
 */

function normalizeScores(rows) {

    if (!rows.length) {
        return rows;
    }

    const maxScore =
        Math.max(
            ...rows.map(
                row =>
                    Number(row.relevance) || 0
            )
        );

    if (maxScore <= 0) {
        return rows;
    }

    return rows.map(row => ({
        ...row,

        normalized_relevance:
            (
                Number(row.relevance) /
                maxScore
            )

    }));

}


/* ============================================================
 * MERGE RESULTS
 * ============================================================
 */

function mergeResults(
    exactResults,
    naturalResults,
    booleanResults,
    detectedAct
) {

    const resultMap =
        new Map();


    /*
     * --------------------------------------------------------
     * EXACT RESULTS
     * --------------------------------------------------------
     */

    for (const row of exactResults) {

        resultMap.set(
            row.id,
            {
                ...row,

                final_score:
                    1000,

                retrieval_type:
                    row.retrieval_type ||
                    "exact_section",

                evidence_strength:
                    "exact"
            }
        );

    }


    /*
     * --------------------------------------------------------
     * NATURAL + BOOLEAN RESULTS
     * --------------------------------------------------------
     */

    const normalizedNatural =
        normalizeScores(
            naturalResults
        );

    const normalizedBoolean =
        normalizeScores(
            booleanResults
        );


    for (const row of [
        ...normalizedNatural,
        ...normalizedBoolean
    ]) {

        const existing =
            resultMap.get(row.id);

        const naturalContribution =
            row.retrieval_type ===
            "fulltext_natural"
                ? (
                    Number(
                        row.normalized_relevance
                    ) || 0
                ) * 0.60
                : 0;

        const booleanContribution =
            row.retrieval_type ===
            "fulltext_boolean"
                ? (
                    Number(
                        row.normalized_relevance
                    ) || 0
                ) * 0.40
                : 0;

        const contribution =
            naturalContribution +
            booleanContribution;


        if (!existing) {

            resultMap.set(
                row.id,
                {
                    ...row,

                    final_score:
                        contribution,

                    evidence_strength:
                        "retrieved"
                }
            );

        } else {

            /*
             * Same provision appeared in more than one
             * retrieval method.
             *
             * Give it a small consistency bonus.
             */

            const retrievalMethods =
                new Set(
                    existing.retrieval_methods ||
                    [existing.retrieval_type]
                );

            retrievalMethods.add(
                row.retrieval_type
            );

            existing.retrieval_methods =
                Array.from(
                    retrievalMethods
                );

            existing.final_score =
                Math.max(
                    existing.final_score || 0,
                    contribution
                ) + 0.10;

        }

    }


    /*
     * --------------------------------------------------------
     * APPLY ACT PREFERENCE
     * --------------------------------------------------------
     */

    let results =
        Array.from(
            resultMap.values()
        );


    results =
        applyActPreference(
            results,
            detectedAct
        );


    /*
     * If the user explicitly named an Act,
     * add a small ranking preference.
     *
     * Normally every result will already be from that Act
     * because the SQL layer is constrained.
     */

    results =
        results.map(row => {

            let score =
                Number(
                    row.final_score
                ) || 0;

            if (row.act_match) {
                score += 0.20;
            }

            return {
                ...row,
                final_score: score
            };

        });


    /*
     * --------------------------------------------------------
     * FINAL SORT
     * --------------------------------------------------------
     */

    results.sort(
        (a, b) =>
            (
                Number(b.final_score) || 0
            ) -
            (
                Number(a.final_score) || 0
            )
    );


    return results;

}


/* ============================================================
 * CLEAN RESULT
 * ============================================================
 */

function cleanResult(row) {

    return {

        id:
            row.id,

        act_name:
            row.act_name,

        act_number:
            row.act_number,

        section_number:
            row.section_number,

        section_title:
            row.section_title,

        content:
            row.content,

        source_name:
            row.source_name,

        source_url:
            row.source_url,

        effective_date:
            row.effective_date,

        source_version:
            row.source_version,

        relevance:
            Number(
                row.final_score || 0
            ),

        retrieval_type:
            row.retrieval_type ||
            "fulltext",

        retrieval_methods:
            row.retrieval_methods ||
            [
                row.retrieval_type ||
                "fulltext"
            ]

    };

}


/* ============================================================
 * MAIN RETRIEVAL FUNCTION
 * ============================================================
 */

async function retrieveRelevantLaws(
    query,
    limit = DEFAULT_LIMIT
) {

    if (
        !query ||
        !String(query).trim()
    ) {

        return [];

    }


    const searchQuery =
        normalizeQuery(query);


    const safeLimit =
        Math.min(
            Math.max(
                Number(limit) ||
                DEFAULT_LIMIT,
                1
            ),
            20
        );


    console.log(
        "================================================"
    );

    console.log(
        "LEGAL RAG RETRIEVAL"
    );

    console.log(
        `Query: ${searchQuery}`
    );


    try {

        /*
         * ----------------------------------------------------
         * STEP 1 — DETECT SECTION
         * ----------------------------------------------------
         */

        const sectionNumber =
            extractSectionNumber(
                searchQuery
            );


        /*
         * ----------------------------------------------------
         * STEP 2 — DETECT ACT
         * ----------------------------------------------------
         */

        const detectedAct =
            detectAct(
                searchQuery
            );


        if (detectedAct) {

            console.log(
                `LEGAL RAG: Act detected → ${detectedAct.actName}`
            );

        }


        if (sectionNumber) {

            console.log(
                `LEGAL RAG: Section detected → ${sectionNumber}`
            );

        }


        /*
         * ----------------------------------------------------
         * STEP 3 — EXACT SECTION RETRIEVAL
         * ----------------------------------------------------
         */

        let exactResults = [];


        if (sectionNumber) {

            exactResults =
                await retrieveExactSection(
                    sectionNumber,
                    detectedAct
                        ? detectedAct.actName
                        : null
                );


            if (
                exactResults.length > 0
            ) {

                console.log(
                    `LEGAL RAG: Exact retrieval found ${exactResults.length} provision(s)`
                );

            }

        }


        /*
         * ----------------------------------------------------
         * AUTHORITATIVE EXPLICIT REFERENCE PATH
         * ----------------------------------------------------
         *
         * When the user explicitly names both an Act and a
         * section, the exact database match is authoritative.
         *
         * Do NOT fall back to generic FULLTEXT retrieval in
         * this situation.
         *
         * This prevents an acronym such as BSA from being
         * reinterpreted as an unrelated law.
         */

        if (
            sectionNumber &&
            detectedAct
        ) {

            if (
                exactResults.length > 0
            ) {

                const authoritativeResults =
                    exactResults
                        .slice(0, safeLimit)
                        .map(cleanResult);

                console.log(
                    "LEGAL RAG: Explicit Act + section resolved deterministically."
                );

                authoritativeResults
                    .forEach(
                        (law, index) => {

                            console.log(
                                `${index + 1}. ` +
                                `${law.act_name} ` +
                                `Section ${law.section_number} ` +
                                "(authoritative_exact)"
                            );

                        }
                    );

                console.log(
                    "================================================"
                );

                return authoritativeResults;

            }

            /*
             * The requested Act/section is known, but the
             * corpus has no text for that exact provision.
             *
             * Never substitute another Act's section merely
             * because its wording looks similar.
             */

            console.warn(
                "LEGAL RAG: Explicit Act + section was not found in the legal corpus.",
                detectedAct.actName,
                sectionNumber
            );

            console.log(
                "LEGAL RAG: Returning no substitute provision."
            );

            console.log(
                "================================================"
            );

            return [];

        }


        /*
         * ----------------------------------------------------
         * STEP 4 — NATURAL LANGUAGE SEARCH
         * ----------------------------------------------------
         */

        const expandedQuery =
            expandLegalTerms(
                searchQuery
            );


        console.log(
            `LEGAL RAG: Expanded query → ${expandedQuery}`
        );


        /*
         * IMPORTANT:
         *
         * When an Act is detected, pass the Act name into
         * retrieveNaturalLanguage().
         *
         * The SQL query will then contain:
         *
         *     AND act_name = ?
         *
         * This prevents cross-Act retrieval.
         */

        const naturalResults =
            await retrieveNaturalLanguage(
                expandedQuery,
                Math.min(
                    safeLimit *
                    NATURAL_FETCH_MULTIPLIER,
                    50
                ),
                detectedAct
                    ? detectedAct.actName
                    : null
            );


        console.log(
            `LEGAL RAG: Natural FULLTEXT → ${naturalResults.length}`
        );


        if (detectedAct) {

            console.log(
                `LEGAL RAG: Natural FULLTEXT constrained to Act → ${detectedAct.actName}`
            );

        }


        /*
         * ----------------------------------------------------
         * STEP 5 — BOOLEAN SEARCH
         * ----------------------------------------------------
         */

        const booleanResults =
            await retrieveBoolean(
                searchQuery,
                Math.min(
                    safeLimit *
                    BOOLEAN_FETCH_MULTIPLIER,
                    50
                ),
                detectedAct
                    ? detectedAct.actName
                    : null
            );


        console.log(
            `LEGAL RAG: Boolean FULLTEXT → ${booleanResults.length}`
        );


        if (detectedAct) {

            console.log(
                `LEGAL RAG: Boolean FULLTEXT constrained to Act → ${detectedAct.actName}`
            );

        }


        /*
         * ----------------------------------------------------
         * STEP 6 — MERGE + RANK
         * ----------------------------------------------------
         */

        const mergedResults =
            mergeResults(
                exactResults,
                naturalResults,
                booleanResults,
                detectedAct
            );


        /*
         * ----------------------------------------------------
         * STEP 7 — FINAL RESULT LIMIT
         * ----------------------------------------------------
         */

        const finalResults =
            mergedResults
                .slice(0, safeLimit)
                .map(cleanResult);


        console.log(
            `LEGAL RAG: Final results → ${finalResults.length}`
        );


        if (
            finalResults.length > 0
        ) {

            console.log(
                "LEGAL RAG: Top provisions:"
            );

            finalResults
                .forEach(
                    (law, index) => {

                        console.log(
                            `${index + 1}. ` +
                            `${law.act_name} ` +
                            `Section ${law.section_number} ` +
                            `(${law.retrieval_type})`
                        );

                    }
                );

        } else {

            console.log(
                "LEGAL RAG: No matching provisions found."
            );

        }


        console.log(
            "================================================"
        );


        return finalResults;


    } catch (error) {

        console.error(
            "LEGAL RETRIEVAL ERROR:",
            error.message
        );

        console.log(
            "================================================"
        );


        return [];

    }

}


/* ============================================================
 * EXPORT
 * ============================================================
 */

module.exports = {

    retrieveRelevantLaws,

    /*
     * Exported for testing/debugging.
     * They do not change the existing agent API.
     */

    extractSectionNumber,

    detectAct,

    expandLegalTerms,

    buildBooleanQuery

};