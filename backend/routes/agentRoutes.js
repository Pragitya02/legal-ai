const express = require("express");
const rateLimit = require("express-rate-limit");
const masterAgent = require("../agents/masterAgent");

const router = express.Router();

// The hackathon endpoint is intentionally separate from the authenticated
// application routes. It performs no account, case, or notification writes.
const agentLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: "Too many agent requests. Please try again later.",
    },
});

const MAX_MESSAGE_LENGTH = 12000;

function cleanMessage(value) {
    if (typeof value !== "string") {
        return "";
    }

    return value.trim().slice(0, MAX_MESSAGE_LENGTH);
}

// GET /api/agent/health
// Lightweight endpoint for deployment and hackathon connectivity checks.
router.get("/health", (req, res) => {
    res.set("Cache-Control", "no-store");

    return res.json({
        success: true,
        agent: "Nyaya AI",
        status: "online",
        version: "1.0.0",
        endpoint: "/api/agent",
        capabilities: [
            "case_analysis",
            "indian_legal_research",
            "legal_specialization_detection",
            "report_generation",
        ],
    });
});

// POST /api/agent
// Standalone BharatAgentic-compatible entry point.
// Input: { "message": "..." }
// The legacy { "case": "..." } field is also accepted.
router.post("/", agentLimiter, async (req, res) => {
    try {
        const message = cleanMessage(
            req.body?.message ?? req.body?.case
        );

        if (!message) {
            return res.status(400).json({
                success: false,
                message: "message is required.",
                expected: {
                    message: "Your legal question or case description",
                },
            });
        }

        const result = await masterAgent({
            case: message,
        });

        if (!result || result.success !== true) {
            return res.status(502).json({
                success: false,
                agent: "Nyaya AI",
                message:
                    result?.error ||
                    "The Nyaya AI agent could not complete the request.",
            });
        }

        res.set("Cache-Control", "no-store");

        return res.json({
            success: true,
            agent: "Nyaya AI",
            version: "1.0.0",
            response: result.response,
            specialization:
                result.specialization || "General Civil Law",
            workflow: [
                "understand_request",
                "analyze_case",
                "research_indian_law",
                "detect_legal_specialization",
                "generate_legal_report",
                "deliver_guidance",
            ],
        });
    } catch (error) {
        console.error(
            "NYAYA AGENT API ERROR:",
            error?.message || error
        );

        return res.status(500).json({
            success: false,
            agent: "Nyaya AI",
            message: "Failed to process the agent request.",
        });
    }
});

module.exports = router;
