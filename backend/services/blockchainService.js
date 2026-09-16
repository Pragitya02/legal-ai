// =====================================================
// BLOCKCHAIN SERVICE (FOUNDATION)
// =====================================================
//
// STEP 1 of the blockchain-based legal document integrity
// system. This module is intentionally self-contained and
// is NOT wired into any route yet.
//
// What this module does:
//   1. hashDocument(buffer)        -> SHA-256 hex digest
//   2. anchorHashOnChain(hashHex)  -> sends the hash to an
//                                     EVM-compatible chain,
//                                     returns { txHash, ... }
//   3. verifyHashOnChain(txHash)   -> reads a past transaction
//                                     back and returns the hash
//                                     that was anchored in it
//
// Design notes:
//   - We only ever store a SHA-256 fingerprint of a document,
//     never the document itself, on-chain.
//   - The hash is embedded in the `data` field of a plain
//     transaction sent from the configured wallet to itself
//     (or to BLOCKCHAIN_TARGET_ADDRESS if set). This needs no
//     smart contract deployment, keeping this foundation step
//     minimal, while still giving an immutable, publicly
//     verifiable transaction hash (txHash) per document.
//   - All blockchain calls are guarded by validateBlockchainConfig()
//     so that missing/incomplete configuration fails fast with
//     a clear error instead of a confusing low-level error, and
//     so the rest of the app is unaffected when the feature is
//     left disabled (the default).
//   - The private key is only ever read from process.env,
//     only ever used in-memory to construct a signer, and is
//     never logged or returned to any caller.
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

// ethers is only required lazily (inside functions) so that
// simply requiring this file never fails even before the
// dependency is installed or configured. This keeps Step 1
// from having any side effect on app startup.
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
// Accepts a Buffer (e.g. req.file.buffer from multer, or any
// file content read from disk) and returns a SHA-256 hex
// digest, prefixed with "0x" so it is ready to be embedded in
// an EVM transaction's data field.
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

    return `0x${digest}`;
}

// =====================================================
// 2. CHAIN CLIENT (lazy singleton)
// =====================================================
// Builds an ethers provider + wallet from environment
// variables. Throws a clear, non-sensitive error if the
// configuration is missing or invalid.
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
    const wallet = new ethers.Wallet(getPrivateKey(), provider);

    return wallet;
}

// =====================================================
// 3. ANCHOR A HASH ON-CHAIN
// =====================================================
// Sends a zero-value transaction whose `data` field carries
// the document's SHA-256 hash. Returns the transaction hash
// (the permanent, publicly verifiable pointer to this record)
// once the transaction has been broadcast.
//
// documentHash: the "0x"-prefixed hex string from hashDocument().
// Returns: { txHash, from, to, network }
// =====================================================

async function anchorHashOnChain(documentHash) {
    if (typeof documentHash !== "string" || !/^0x[0-9a-f]{64}$/i.test(documentHash)) {
        throw new Error(
            "anchorHashOnChain expects a 0x-prefixed 32-byte SHA-256 hash string."
        );
    }

    const wallet = getSigner();
    const toAddress = getTargetAddress() || wallet.address;

    const tx = await wallet.sendTransaction({
        to: toAddress,
        value: 0,
        data: documentHash,
    });

    // Wait for the transaction to be mined/confirmed so callers
    // (Step 3) get back a settled result instead of a merely
    // broadcast-but-unconfirmed transaction. `tx.wait()` resolves
    // once the transaction has at least one confirmation on the
    // configured testnet.
    const receipt = await tx.wait();

    return {
        txHash: tx.hash,
        from: wallet.address,
        to: toAddress,
        network: getNetworkName() || "unknown",
        confirmed: Boolean(receipt && receipt.status === 1),
        blockNumber: (receipt && receipt.blockNumber) || null,
    };
}

// =====================================================
// 4. VERIFY A HASH ON-CHAIN
// =====================================================
// Looks up a previously-broadcast transaction by its hash and
// returns the document hash that was embedded in its `data`
// field, along with basic confirmation info. Callers can
// compare the returned hash against a freshly computed
// hashDocument() result to confirm document integrity.
// =====================================================

async function verifyHashOnChain(txHash) {
    if (typeof txHash !== "string" || !/^0x[0-9a-f]{64}$/i.test(txHash)) {
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
    const provider = new ethers.JsonRpcProvider(getRpcUrl());

    const tx = await provider.getTransaction(txHash);

    if (!tx) {
        return {
            found: false,
            confirmed: false,
            documentHash: null,
        };
    }

    const receipt = await provider.getTransactionReceipt(txHash);

    return {
        found: true,
        confirmed: Boolean(receipt && receipt.status === 1),
        documentHash: tx.data,
        blockNumber: tx.blockNumber || null,
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
