"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { PDFParse } = require("pdf-parse");

// ============================================================================
// MODE
// ============================================================================

const dryRun = process.argv.includes("--dry-run");

// IMPORTANT:
// In dry-run mode the DB module is not loaded at all.
const db = dryRun ? null : require("../db");

// ============================================================================
// PATHS
// ============================================================================

const DATA_DIR = path.join(__dirname, "..", "data_legal");

// ============================================================================
// LEGAL DOCUMENTS
// ============================================================================

const LEGAL_DOCUMENTS = [
    {
        fileName: "BNS.pdf",
        actName: "Bharatiya Nyaya Sanhita, 2023",
        actNumber: "45 of 2023",
        expectedSections: 358,
        sourceName: "India Code",
        sourceUrl:
            "https://www.indiacode.nic.in/bitstream/123456789/20062/1/a202345.pdf",
        sourceVersion: "2023",
    },

    {
        fileName: "BNSS.pdf",
        actName: "Bharatiya Nagarik Suraksha Sanhita, 2023",
        actNumber: "46 of 2023",
        expectedSections: 531,
        sourceName: "India Code",
        sourceUrl:
            "https://www.indiacode.nic.in/bitstream/123456789/20335/1/a2023-46.pdf",
        sourceVersion: "2023",
    },

    {
        fileName: "BSA.pdf",
        actName: "Bharatiya Sakshya Adhiniyam, 2023",
        actNumber: "47 of 2023",
        expectedSections: 170,
        sourceName: "India Code",
        sourceUrl:
            "https://www.indiacode.nic.in/bitstream/123456789/20063/1/aa202347.pdf",
        sourceVersion: "2023",
    },
];

// ============================================================================
// BNS SECTION 192 FALLBACK
// ============================================================================

const BNS_SECTION_192 = {
    sectionNumber: "192",

    sectionTitle:
        "Wantonly giving provocation with intent to cause riot-if rioting be committed; if not committed.",

    content:
        "192. Wantonly giving provocation with intent to cause riot-if rioting be committed; if not committed.—Whoever malignantly, or wantonly by doing anything which is illegal, gives provocation to any person intending or knowing it to be likely that such provocation will cause the offence of rioting to be committed, shall, if the offence of rioting be committed in consequence of such provocation, be punished with imprisonment of either description for a term which may extend to one year, or with fine, or with both; and if the offence of rioting be not committed, with imprisonment of either description for a term which may extend to six months, or with fine, or with both.",
};

// ============================================================================
// HASH
// ============================================================================

function hashContent(content) {
    return crypto
        .createHash("sha256")
        .update(content, "utf8")
        .digest("hex");
}

// ============================================================================
// BASIC TEXT CLEANUP
// ============================================================================

function cleanText(text) {
    return String(text || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\u00A0/g, " ")
        .replace(/\u200B/g, "")
        .replace(/\u200C/g, "")
        .replace(/\u200D/g, "")
        .replace(/\uFEFF/g, "")
        .replace(/\u00AD/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n[ \t]+/g, "\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

// ============================================================================
// REMOVE PDF NOISE
// ============================================================================

function removePdfNoise(text) {
    let result = text;

    // PDF page counters.
    result = result.replace(
        /--\s*\d+\s+of\s+\d+\s*--/gi,
        ""
    );

    // Gazette separator lines.
    result = result.replace(/_{3,}/g, "");

    // PDF control strings.
    result = result.replace(/xxxGIDHxxx/gi, "");
    result = result.replace(/xxxGIDExxx/gi, "");

    return result;
}

// ============================================================================
// NORMALIZE SECTION NUMBER FORMATTING
// ============================================================================

function normalizeSectionHeadingFormatting(text) {
    let result = String(text || "");

    result = result
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\u00A0/g, " ")
        .replace(/\uFF0E/g, ".")
        .replace(/\u2024/g, ".")
        .replace(/\u00B7/g, ".")
        .replace(/\u2022/g, ".");

    /*
     * Convert:
     *
     * 20
     * .
     * Title
     *
     * into:
     *
     * 20. Title
     */

    result = result.replace(
        /(^|\n)\s*(\d{1,3})\s*\n\s*\.\s*\n?/g,
        "$1$2. "
    );

    /*
     * Convert:
     *
     * 20 . Title
     *
     * into:
     *
     * 20. Title
     */

    result = result.replace(
        /(^|\n)\s*(\d{1,3})\s+\.\s*/g,
        "$1$2. "
    );

    return result;
}

// ============================================================================
// REMOVE SCHEDULES
// ============================================================================

function cutBeforeSchedules(text) {
    const markers = [
        /\nTHE FIRST SCHEDULE\b/i,
        /\nTHE SECOND SCHEDULE\b/i,
        /\nTHE THIRD SCHEDULE\b/i,
        /\nTHE FOURTH SCHEDULE\b/i,
        /\nTHE FIFTH SCHEDULE\b/i,
        /\nTHE SIXTH SCHEDULE\b/i,
        /\nTHE SEVENTH SCHEDULE\b/i,
        /\nTHE SCHEDULE\b/i,
    ];

    let result = text;

    for (const marker of markers) {
        const match = marker.exec(result);

        if (match) {
            result = result.slice(0, match.index);
        }
    }

    return result;
}

// ============================================================================
// NORMALIZE LINE
// ============================================================================

function normalizeLine(line) {
    return String(line || "")
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// ============================================================================
// SECTION NUMBER DETECTION
// ============================================================================

function getSectionNumberFromLine(line) {
    const normalized = normalizeLine(line);

    if (!normalized) {
        return null;
    }

    /*
     * Normal form:
     *
     * 65. Punishment...
     *
     * Also accepts:
     *
     * 65 . Punishment...
     */

    const normal = normalized.match(
        /^(\d{1,3})\s*[\.\u2024\u00B7\uFF0E]\s*(.*)$/
    );

    if (normal) {
        const number = Number(normal[1]);

        if (number >= 1 && number <= 600) {
            return {
                number,
                remainder: normal[2].trim(),
                form: "normal",
            };
        }
    }

    /*
     * Number-only line:
     *
     * 65
     */

    const numberOnly = normalized.match(/^(\d{1,3})$/);

    if (numberOnly) {
        const number = Number(numberOnly[1]);

        if (number >= 1 && number <= 600) {
            return {
                number,
                remainder: "",
                form: "number-only",
            };
        }
    }

    return null;
}

function isStandaloneDot(line) {
    return /^[.\u2024\u00B7\uFF0E]$/.test(
        normalizeLine(line)
    );
}

// ============================================================================
// FIND ALL SECTION CANDIDATES
// ============================================================================

function findSectionCandidates(text) {
    const lines = text.split("\n");

    const candidates = [];

    let offset = 0;

    for (let i = 0; i < lines.length; i++) {
        const originalLine = lines[i];

        const line = normalizeLine(originalLine);

        const parsed = getSectionNumberFromLine(line);

        if (parsed) {
            let remainder = parsed.remainder;

            let headingEndLine = i;

            /*
             * Handle:
             *
             * 65
             * .
             * Punishment...
             */

            if (parsed.form === "number-only") {
                const next1 =
                    i + 1 < lines.length
                        ? normalizeLine(lines[i + 1])
                        : "";

                const next2 =
                    i + 2 < lines.length
                        ? normalizeLine(lines[i + 2])
                        : "";

                if (isStandaloneDot(next1)) {
                    remainder = next2;

                    headingEndLine = i + 2;
                } else if (next1) {
                    /*
                     * Some extracted PDFs produce:
                     *
                     * 65
                     * Punishment...
                     */

                    remainder = next1;

                    headingEndLine = i + 1;
                }
            }

            candidates.push({
                sectionNumber: String(parsed.number),
                lineIndex: i,
                headingEndLine,
                start: offset,
                remainder,
                form: parsed.form,
            });
        }

        offset += originalLine.length + 1;
    }

    return {
        lines,
        candidates,
    };
}

// ============================================================================
// REAL SECTION CHECK
// ============================================================================

function isLikelyRealSection(candidate, document) {
    const number = Number(candidate.sectionNumber);

    if (!Number.isInteger(number)) {
        return false;
    }

    if (number < 1) {
        return false;
    }

    if (number > document.expectedSections) {
        return false;
    }

    return true;
}

// ============================================================================
// CANDIDATE GAP
// ============================================================================

function candidateGap(
    candidates,
    index,
    textLength
) {
    const current = candidates[index];

    if (!current) {
        return 0;
    }

    const next = candidates[index + 1];

    if (!next) {
        return textLength - current.start;
    }

    return Math.max(
        0,
        next.start - current.start
    );
}

// ============================================================================
// SCORE SECTION 1 START
// ============================================================================

function scoreStartCandidate(
    allCandidates,
    startIndex,
    document,
    textLength
) {
    const first = allCandidates[startIndex];

    if (
        !first ||
        first.sectionNumber !== "1"
    ) {
        return -Infinity;
    }

    let expected = 1;
    let index = startIndex;
    let score = 0;
    let matched = 0;

    while (
        index < allCandidates.length &&
        expected <= document.expectedSections
    ) {
        const candidate = allCandidates[index];

        if (
            candidate.sectionNumber ===
            String(expected)
        ) {
            const gap = candidateGap(
                allCandidates,
                index,
                textLength
            );

            score += 100;
            matched++;

            /*
             * Prefer realistic gaps.
             *
             * This is only a secondary score.
             * The exact sequential numbering is the
             * primary safety mechanism.
             */

            score += Math.min(
                gap / 100,
                30
            );

            expected++;
            index++;

            continue;
        }

        index++;

        /*
         * Do not allow a random "1" far away
         * from the actual Act to create a match.
         */

        if (
            index < allCandidates.length &&
            allCandidates[index].start -
                first.start >
                250000
        ) {
            break;
        }
    }

    /*
     * Huge bonus if the complete Act sequence
     * was found.
     */

    if (
        matched ===
        document.expectedSections
    ) {
        score += 1000000;
    }

    score += matched * 500;

    return score;
}

// ============================================================================
// SELECT ACTUAL SECTION CANDIDATES
// ============================================================================

function selectSectionCandidates(
    text,
    document
) {
    const normalized =
        normalizeSectionHeadingFormatting(text);

    const {
        lines,
        candidates: rawCandidates,
    } = findSectionCandidates(normalized);

    const validCandidates =
        rawCandidates.filter(
            (candidate) =>
                isLikelyRealSection(
                    candidate,
                    document
                )
        );

    let bestStartIndex = -1;
    let bestScore = -Infinity;

    for (
        let i = 0;
        i < validCandidates.length;
        i++
    ) {
        if (
            validCandidates[i]
                .sectionNumber !== "1"
        ) {
            continue;
        }

        const score =
            scoreStartCandidate(
                validCandidates,
                i,
                document,
                normalized.length
            );

        if (score > bestScore) {
            bestScore = score;
            bestStartIndex = i;
        }
    }

    const selected = [];

    if (bestStartIndex >= 0) {
        let searchIndex = bestStartIndex;

        for (
            let expected = 1;
            expected <= document.expectedSections;
            expected++
        ) {
            const expectedString =
                String(expected);

            let chosenIndex = -1;

            for (
                let i = searchIndex;
                i < validCandidates.length;
                i++
            ) {
                if (
                    validCandidates[i]
                        .sectionNumber ===
                    expectedString
                ) {
                    chosenIndex = i;
                    break;
                }
            }

            if (chosenIndex === -1) {
                continue;
            }

            selected.push(
                validCandidates[chosenIndex]
            );

            searchIndex =
                chosenIndex + 1;
        }
    }

    /*
     * Remove duplicate candidate offsets.
     */

    const unique = [];
    const seen = new Set();

    for (const candidate of selected) {
        if (seen.has(candidate.start)) {
            continue;
        }

        seen.add(candidate.start);
        unique.push(candidate);
    }

    return {
        text: normalized,
        lines,
        candidates: unique,
        allCandidates: validCandidates,
        startScore: bestScore,
    };
}

// ============================================================================
// CLEAN SECTION CONTENT
// ============================================================================

function cleanSectionContent(content) {
    let result = String(content || "");

    /*
     * Remove PDF page counters.
     */

    result = result.replace(
        /--\s*\d+\s+of\s+\d+\s*--/gi,
        ""
    );

    /*
     * Remove common publication tails.
     */

    result = result.replace(
        /\nMINISTRY OF LAW AND JUSTICE[\s\S]*$/i,
        ""
    );

    result = result.replace(
        /\nTHE GAZETTE OF INDIA EXTRAORDINARY[\s\S]*$/i,
        ""
    );

    result = result.replace(
        /\nUPLOADED BY THE MANAGER[\s\S]*$/i,
        ""
    );

    result = result.replace(
        /\nPUBLISHED BY THE CONTROLLER OF PUBLICATIONS[\s\S]*$/i,
        ""
    );

    /*
     * Remove excessive blank lines.
     */

    result = result.replace(
        /\n{3,}/g,
        "\n\n"
    );

    return result.trim();
}

// ============================================================================
// CONTENT PREFIX
// ============================================================================

function normalizeSectionPrefix(
    content,
    sectionNumber
) {
    const expected =
        String(sectionNumber);

    let result =
        String(content || "").trim();

    /*
     * Normalize:
     *
     * 1
     * 1.
     * 1 . 
     *
     * into:
     *
     * 1.
     */

    const prefixRegex = new RegExp(
        "^\\s*" +
            expected +
            "\\s*[\\.\\u2024\\u00B7\\uFF0E]?\\s*",
        "u"
    );

    result = result.replace(
        prefixRegex,
        expected + ". "
    );

    return result.trim();
}

// ============================================================================
// CONTENT INTEGRITY
// ============================================================================

function validateSectionContent(
    sections,
    document
) {
    const errors = [];

    for (const section of sections) {
        const expected =
            String(section.sectionNumber);

        const content =
            normalizeSectionPrefix(
                section.content,
                expected
            );

        if (!content) {
            errors.push(
                `Section ${expected}: empty content`
            );

            continue;
        }

        if (
            !content.startsWith(
                expected + "."
            )
        ) {
            errors.push(
                `Section ${expected}: content does not start with ${expected}.`
            );
        }

        /*
         * Check that the section did not
         * accidentally start with another
         * section number.
         */

        const wrongStart =
            content.match(
                /^(\d{1,3})\./
            );

        if (
            wrongStart &&
            wrongStart[1] !== expected
        ) {
            errors.push(
                `Section ${expected}: starts with section ${wrongStart[1]}`
            );
        }
    }

    /*
     * Also verify expected count.
     */

    if (
        sections.length !==
        document.expectedSections
    ) {
        errors.push(
            `${document.actName}: expected ${document.expectedSections} sections but got ${sections.length}`
        );
    }

    return {
        complete: errors.length === 0,
        errors,
    };
}

// ============================================================================
// EXTRACT SECTIONS
// ============================================================================

function extractSections(
    text,
    document
) {
    let cleaned =
        cleanText(text);

    cleaned =
        removePdfNoise(cleaned);

    cleaned =
        cutBeforeSchedules(cleaned);

    const selected =
        selectSectionCandidates(
            cleaned,
            document
        );

    const normalized =
        selected.text;

    const candidates =
        selected.candidates;

    const sections = [];

    /*
     * IMPORTANT:
     *
     * We intentionally DO NOT attempt to reconstruct
     * section titles from the flattened PDF text.
     *
     * The official Gazette PDFs can contain titles
     * in side columns. pdf-parse flattens those columns
     * into the text stream, which can place a heading:
     *
     * - after its legal body
     * - before another section
     * - or mixed with another section's heading.
     *
     * Storing a wrong legal title is worse than storing
     * NULL.
     */

    for (
        let i = 0;
        i < candidates.length;
        i++
    ) {
        const current =
            candidates[i];

        const next =
            candidates[i + 1];

        const start =
            current.start;

        const end = next
            ? next.start
            : normalized.length;

        let content =
            normalized
                .slice(start, end)
                .trim();

        content =
            cleanSectionContent(content);

        if (!content) {
            continue;
        }

        content =
            normalizeSectionPrefix(
                content,
                current.sectionNumber
            );

        sections.push({
            sectionNumber:
                current.sectionNumber,

            /*
             * SAFE MODE:
             *
             * No guessed titles.
             */

            sectionTitle: null,

            content,
        });
    }

    /*
     * Deduplicate section numbers.
     *
     * If two candidates somehow survived,
     * keep the longer content.
     */

    const unique =
        new Map();

    for (const section of sections) {
        const existing =
            unique.get(
                section.sectionNumber
            );

        if (
            !existing ||
            section.content.length >
                existing.content.length
        ) {
            unique.set(
                section.sectionNumber,
                section
            );
        }
    }

    let finalSections =
        Array.from(
            unique.values()
        );

    /*
     * BNS 192 safety fallback.
     *
     * Only use this if PDF extraction missed it.
     */

    if (
        document.actName ===
            "Bharatiya Nyaya Sanhita, 2023" &&
        !finalSections.some(
            (section) =>
                section.sectionNumber ===
                "192"
        )
    ) {
        finalSections.push({
            ...BNS_SECTION_192,
        });

        console.log(
            "Added BNS section 192 using fallback."
        );
    }

    /*
     * Sort numerically.
     */

    finalSections.sort(
        (a, b) =>
            Number(a.sectionNumber) -
            Number(b.sectionNumber)
    );

    return finalSections;
}

// ============================================================================
// VALIDATE SECTION NUMBERS
// ============================================================================

function validateSections(
    sections,
    document
) {
    const numbers =
        sections
            .map((section) =>
                Number(
                    section.sectionNumber
                )
            )
            .filter(Number.isFinite)
            .sort((a, b) => a - b);

    const missing = [];

    for (
        let i = 1;
        i <= document.expectedSections;
        i++
    ) {
        if (!numbers.includes(i)) {
            missing.push(i);
        }
    }

    const duplicates = [];

    for (
        let i = 1;
        i < numbers.length;
        i++
    ) {
        if (
            numbers[i] ===
            numbers[i - 1]
        ) {
            duplicates.push(
                numbers[i]
            );
        }
    }

    const extra =
        numbers.filter(
            (number) =>
                number < 1 ||
                number >
                    document.expectedSections
        );

    const complete =
        sections.length ===
            document.expectedSections &&
        missing.length === 0 &&
        duplicates.length === 0 &&
        extra.length === 0;

    return {
        complete,
        numbers,
        missing,
        duplicates,
        extra,
    };
}

// ============================================================================
// PRINT NUMBER VALIDATION
// ============================================================================

function printValidation(
    document,
    sections
) {
    const validation =
        validateSections(
            sections,
            document
        );

    console.log(
        "Detected sections: " +
            sections.length
    );

    if (validation.complete) {
        console.log(
            "Section numbering check: 1-" +
                document.expectedSections +
                " complete"
        );
    } else {
        if (validation.missing.length) {
            console.log(
                "Missing section numbers: " +
                    validation.missing.join(", ")
            );
        }

        if (validation.duplicates.length) {
            console.log(
                "Duplicate section numbers: " +
                    [
                        ...new Set(
                            validation.duplicates
                        ),
                    ].join(", ")
            );
        }

        if (validation.extra.length) {
            console.log(
                "Unexpected section numbers: " +
                    validation.extra.join(", ")
            );
        }
    }

    return validation;
}

// ============================================================================
// PRINT CONTENT VALIDATION
// ============================================================================

function printContentValidation(
    document,
    sections
) {
    const validation =
        validateSectionContent(
            sections,
            document
        );

    if (validation.complete) {
        console.log(
            "Content integrity check: PASS"
        );
    } else {
        console.log(
            "Content integrity check: FAILED"
        );

        for (const error of validation.errors) {
            console.log(
                "  - " + error
            );
        }
    }

    return validation;
}

// ============================================================================
// PREVIEW
// ============================================================================

function printSectionPreview(section) {
    console.log({
        sectionNumber:
            section.sectionNumber,

        sectionTitle:
            section.sectionTitle,

        contentPreview:
            section.content.slice(
                0,
                250
            ),
    });
}

// ============================================================================
// READ PDF
// ============================================================================

async function readPdf(document) {
    const filePath =
        path.join(
            DATA_DIR,
            document.fileName
        );

    if (!fs.existsSync(filePath)) {
        throw new Error(
            "Missing PDF: " +
                filePath
        );
    }

    const buffer =
        fs.readFileSync(filePath);

    console.log(
        document.fileName +
            ": " +
            (
                buffer.length /
                1024 /
                1024
            ).toFixed(2) +
            " MB"
    );

    const parser =
        new PDFParse({
            data: buffer,
        });

    try {
        const parsed =
            await parser.getText();

        if (
            !parsed.text ||
            !parsed.text.trim()
        ) {
            throw new Error(
                document.fileName +
                    ": PDF contains no extractable text"
            );
        }

        return parsed.text;
    } finally {
        await parser.destroy();
    }
}

// ============================================================================
// INGEST DOCUMENT
// ============================================================================

async function ingestDocument(
    document,
    isDryRun
) {
    console.log(
        "\n----------------------------------------"
    );

    console.log(
        "Processing " +
            document.actName
    );

    console.log(
        "----------------------------------------"
    );

    const text =
        await readPdf(document);

    console.log(
        "Extracted characters: " +
            text.length
    );

    /*
     * Extract sections.
     */

    const sections =
        extractSections(
            text,
            document
        );

    /*
     * Numbering validation.
     */

    const numberingValidation =
        printValidation(
            document,
            sections
        );

    /*
     * CRITICAL SAFETY CHECK:
     *
     * Never write incomplete legal data
     * into the database.
     */

    if (!numberingValidation.complete) {
        throw new Error(
            document.actName +
                ": section validation failed. Database ingestion stopped."
        );
    }

    /*
     * Content validation.
     */

    const contentValidation =
        printContentValidation(
            document,
            sections
        );

    if (!contentValidation.complete) {
        throw new Error(
            document.actName +
                ": content integrity validation failed. Database ingestion stopped."
        );
    }

    /*
     * Title safety information.
     */

    console.log(
        "Section title mode: SAFE / UNVERIFIED TITLES STORED AS NULL"
    );

    /*
     * PREVIEW
     */

    console.log(
        "\nFirst 3 sections:"
    );

    for (
        const section of
            sections.slice(0, 3)
    ) {
        printSectionPreview(
            section
        );
    }

    console.log(
        "\nLast 3 sections:"
    );

    for (
        const section of
            sections.slice(-3)
    ) {
        printSectionPreview(
            section
        );
    }

    /*
     * DRY RUN
     */

    if (isDryRun) {
        console.log(
            "\nDRY RUN: database will NOT be modified."
        );

        console.log(
            "First detected section:",
            sections[0]
        );

        console.log(
            "Last detected section:",
            sections[
                sections.length - 1
            ]
        );

        return {
            act: document.actName,
            sections:
                sections.length,
            inserted: 0,
            updated: 0,
            skipped: 0,
        };
    }

    /*
     * LIVE DATABASE INGESTION
     */

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    /*
     * Process one Act at a time.
     */

    for (const section of sections) {
        const contentHash =
            hashContent(
                section.content
            );

        /*
         * Check existing record.
         */

        const [existing] =
            await db.query(
                `
                SELECT id, content_hash
                FROM legal_knowledge
                WHERE act_name = ?
                  AND section_number = ?
                LIMIT 1
                `,
                [
                    document.actName,
                    section.sectionNumber,
                ]
            );

        /*
         * EXISTING RECORD
         */

        if (existing.length > 0) {
            /*
             * No change.
             */

            if (
                existing[0]
                    .content_hash ===
                contentHash
            ) {
                skipped++;
                continue;
            }

            /*
             * Content changed.
             */

            await db.query(
                `
                UPDATE legal_knowledge
                SET
                    act_number = ?,
                    section_title = ?,
                    content = ?,
                    source_name = ?,
                    source_url = ?,
                    source_version = ?,
                    content_hash = ?
                WHERE id = ?
                `,
                [
                    document.actNumber,

                    /*
                     * IMPORTANT:
                     * NULL is intentional.
                     */
                    section.sectionTitle,

                    section.content,

                    document.sourceName,

                    document.sourceUrl,

                    document.sourceVersion,

                    contentHash,

                    existing[0].id,
                ]
            );

            updated++;
            continue;
        }

        /*
         * NEW RECORD
         */

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
                source_version,
                content_hash
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                document.actName,

                document.actNumber,

                section.sectionNumber,

                /*
                 * NULL is intentional.
                 */
                section.sectionTitle,

                section.content,

                document.sourceName,

                document.sourceUrl,

                document.sourceVersion,

                contentHash,
            ]
        );

        inserted++;
    }

    return {
        act: document.actName,
        sections:
            sections.length,
        inserted,
        updated,
        skipped,
    };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
    console.log(
        "========================================"
    );

    console.log(
        "NYAYA AI LEGAL DATA INGESTION"
    );

    console.log(
        "========================================"
    );

    if (dryRun) {
        console.log(
            "MODE: DRY RUN"
        );

        console.log(
            "No database records will be changed."
        );
    } else {
        console.log(
            "MODE: LIVE"
        );

        console.log(
            "Database records WILL be changed."
        );

        console.log(
            "Every Act must pass section validation before database writes."
        );
    }

    console.log(
        "TITLE MODE: SAFE CONTENT-ONLY"
    );

    console.log(
        "Unverified PDF side-column titles will be stored as NULL."
    );

    const results = [];

    try {
        for (
            const document of
                LEGAL_DOCUMENTS
        ) {
            const result =
                await ingestDocument(
                    document,
                    dryRun
                );

            results.push(result);
        }

        console.log(
            "\n========================================"
        );

        console.log(
            "INGESTION FINISHED"
        );

        console.log(
            "========================================"
        );

        console.table(results);

        process.exit(0);
    } catch (error) {
        console.error(
            "\nINGESTION FAILED:"
        );

        console.error(
            error.message ||
                error
        );

        process.exit(1);
    }
}

main();