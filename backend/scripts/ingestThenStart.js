const { spawn } = require("child_process");

console.log("========================================");
console.log("NYAYA AI — SERVER + BACKGROUND TASK");
console.log("========================================");

console.log("Starting web server immediately...");

const server = spawn(
    process.execPath,
    ["server.js"],
    {
        stdio: "inherit",
        env: process.env
    }
);

server.on("error", error => {
    console.error(
        "SERVER PROCESS ERROR:",
        error.message
    );
});

// Decide which background task to run
const isRetryMode = process.argv.includes("--retry-missing");

const ingestionScript = isRetryMode
    ? "scripts/retryMissingLegalProvisions.js"
    : "scripts/ingestCentralActsFast.js";

const ingestionArgs = isRetryMode
    ? []
    : process.argv.slice(2);

console.log(
    isRetryMode
        ? "Starting MISSING PROVISION RETRY in background..."
        : "Starting FULL LEGAL INGESTION in background..."
);

const ingestion = spawn(
    process.execPath,
    [ingestionScript, ...ingestionArgs],
    {
        stdio: "inherit",
        env: process.env
    }
);

ingestion.on("error", error => {
    console.error(
        "BACKGROUND TASK ERROR:",
        error.message
    );
});

ingestion.on("exit", (code, signal) => {
    if (code === 0) {
        console.log(
            isRetryMode
                ? "MISSING PROVISION RETRY FINISHED SUCCESSFULLY."
                : "LEGAL INGESTION FINISHED SUCCESSFULLY."
        );
    } else {
        console.error(
            `BACKGROUND TASK EXITED. code=${code}, signal=${signal}`
        );
    }
});

server.on("exit", (code, signal) => {
    console.error(
        `SERVER EXITED. code=${code}, signal=${signal}`
    );

    if (!ingestion.killed) {
        ingestion.kill("SIGTERM");
    }

    process.exit(
        typeof code === "number" ? code : 1
    );
});

process.on("SIGTERM", () => {
    console.log(
        "SIGTERM received. Stopping processes..."
    );

    if (!server.killed) {
        server.kill("SIGTERM");
    }

    if (!ingestion.killed) {
        ingestion.kill("SIGTERM");
    }
});

process.on("SIGINT", () => {
    console.log(
        "SIGINT received. Stopping processes..."
    );

    if (!server.killed) {
        server.kill("SIGINT");
    }

    if (!ingestion.killed) {
        ingestion.kill("SIGINT");
    }
});