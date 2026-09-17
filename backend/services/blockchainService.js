// =====================================================
// BLOCKCHAIN SERVICE
// =====================================================
//
// Document integrity using:
//   1. SHA-256 document fingerprinting
//   2. EVM blockchain hash anchoring
//   3. Blockchain verification
//
// IMPORTANT HASH FORMAT RULE
// -----------------------------------------------------
// Database:
//     64-character SHA-256 hex string WITHOUT "0x"
//
// Blockchain:
//     0x-prefixed 64-byte-hex representation
//
// Example:
//
// Database:
//     43c861abc123...
//
// Blockchain:
//     0x43c861abc123...
//
// This keeps the database document_hash compatible with
// VARCHAR(64), while still using the correct EVM format
// when communicating with the blockchain.
// =====================================================

const crypto = require("crypto");

const {
    isBlockchainEnabled,
    getRpcUrl,
    getPrivateKey,
    getTargetAddress,
    getNetworkName,
    validateBlockchainConfig,
} = require("../utils/blockchainConfig");

// =====================================================
// LOAD ETHERS LAZILY
// =====================================================

function loadEthers() {
    try {
        return require("ethers");
    } catch (error) {
        throw new Error(
            "The 'ethers' package is not installed. Run `npm install ethers` in /backend to enable blockchain operations."
        );
    }
}

// =====================================================
// 1. DOCUMENT HASHING
// =====================================================
//
// Accepts a Buffer containing the raw document bytes.
//
// RETURNS:
//     64-character SHA-256 hex digest
//
// IMPORTANT:
//     NO "0x" PREFIX is returned here.
//
// Example:
//     43c861abc123...
//
// The database stores this value directly in:
//     documents.document_hash VARCHAR(64)
// =====================================================

function hashDocument(fileBuffer) {
    if (!Buffer.isBuffer(fileBuffer)) {
        throw new Error(
            "hashDocument expects a Buffer of the document's raw bytes."
        );
    }

    const digest = crypto
        .createHash("sha256")
        .update(fileBuffer)
        .digest("hex");

    // SHA-256 produces exactly 64 hexadecimal characters.
    return digest;
}

// =====================================================
// 2. CHAIN CLIENT
// =====================================================
//
// Creates an ethers wallet connected to the configured
// blockchain RPC endpoint.
//
// The private key is never returned to the frontend or
// logged.
// =====================================================

function getSigner() {
    const configCheck = validateBlockchainConfig();

    if (!configCheck.enabled) {
        throw new Error(
            "Blockchain integration is disabled. Set BLOCKCHAIN_ENABLED=true to use it."
        );
    }

    if (!configCheck.valid) {
        throw new Error(
            `Blockchain configuration incomplete. Missing: ${configCheck.missing.join(", ")}`
        );
    }

    const { ethers } = loadEthers();

    const provider = new ethers.JsonRpcProvider(getRpcUrl());

    const wallet = new ethers.Wallet(
        getPrivateKey(),
        provider
    );

    return wallet;
}

// =====================================================
// 3. ANCHOR HASH ON-CHAIN
// =====================================================
//
// documentHash MUST be:
//     64 hexadecimal characters
//
// Example:
//     43c861abc123...
//
// Before sending to EVM, we add "0x":
//
//     0x43c861abc123...
//
// Only the document hash is placed into transaction data.
// The actual legal document is NEVER placed on-chain.
// =====================================================

async function anchorHashOnChain(documentHash) {
    if (
        typeof documentHash !== "string" ||
        !/^[0-9a-f]{64}$/i.test(documentHash)
    ) {
        throw new Error(
            "anchorHashOnChain expects a 64-character SHA-256 hash without the 0x prefix."
        );
    }

    const wallet = getSigner();

    const toAddress =
        getTargetAddress() || wallet.address;

    // Convert the database format into EVM hex format.
    const blockchainData = `0x${documentHash}`;

    const tx = await wallet.sendTransaction({
        to: toAddress,
        value: 0,
        data: blockchainData,
    });

    // Wait until the transaction is mined.
    const receipt = await tx.wait();

    return {
        txHash: tx.hash,
        from: wallet.address,
        to: toAddress,
        network: getNetworkName() || "unknown",
        confirmed: Boolean(
            receipt && receipt.status === 1
        ),
        blockNumber:
            (receipt && receipt.blockNumber) || null,
    };
}

// =====================================================
// 4. VERIFY HASH ON-CHAIN
// =====================================================
//
// txHash is a normal Ethereum transaction hash:
//
//     0x + 64 hexadecimal characters
//
// The transaction data will contain:
//
//     0x + 64-character document hash
//
// We remove the "0x" prefix before returning the
// documentHash so that the returned value has the SAME
// format as hashDocument() and documents.document_hash.
//
// This makes comparison straightforward:
//
//     currentHash === blockchainHash
// =====================================================

async function verifyHashOnChain(txHash) {
    if (
        typeof txHash !== "string" ||
        !/^0x[0-9a-f]{64}$/i.test(txHash)
    ) {
        throw new Error(
            "verifyHashOnChain expects a 0x-prefixed transaction hash."
        );
    }

    const configCheck = validateBlockchainConfig();

    if (!configCheck.enabled) {
        throw new Error(
            "Blockchain integration is disabled. Set BLOCKCHAIN_ENABLED=true to use it."
        );
    }

    if (!configCheck.valid) {
        throw new Error(
            `Blockchain configuration incomplete. Missing: ${configCheck.missing.join(", ")}`
        );
    }

    const { ethers } = loadEthers();

    const provider =
        new ethers.JsonRpcProvider(getRpcUrl());

    const tx =
        await provider.getTransaction(txHash);

    if (!tx) {
        return {
            found: false,
            confirmed: false,
            documentHash: null,
        };
    }

    const receipt =
        await provider.getTransactionReceipt(txHash);

    // Transaction data is expected to be:
    //
    // 0x + 64 hexadecimal characters
    //
    // Normalize it back to the database format.
    const transactionData =
        typeof tx.data === "string"
            ? tx.data
            : "";

    const normalizedHash =
        /^0x[0-9a-f]{64}$/i.test(transactionData)
            ? transactionData.slice(2)
            : null;

    return {
        found: true,
        confirmed: Boolean(
            receipt && receipt.status === 1
        ),
        documentHash: normalizedHash,
        blockNumber:
            tx.blockNumber || null,
    };
}

// =====================================================
// EXPORT
// =====================================================

module.exports = {
    hashDocument,
    anchorHashOnChain,
    verifyHashOnChain,
    isBlockchainEnabled,
};