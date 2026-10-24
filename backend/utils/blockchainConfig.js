// =====================================================
// BLOCKCHAIN CONFIGURATION
// =====================================================
//
// Centralized reader/validator for the blockchain-related
// environment variables used by services/blockchainService.js.
//
// IMPORTANT:
// - No private key, RPC URL, or other credential is ever
//   hardcoded here. Everything comes from process.env.
// - This module never logs secret values (private key),
//   only whether they are present/configured.
// - The blockchain feature is OFF by default. Nothing in
//   the existing app calls this module yet (Step 1 only
//   prepares the foundation).
// =====================================================

// Master switch. Must be explicitly set to "true" to enable
// any blockchain operation. Defaults to disabled so this
// foundation step cannot change existing app behavior.
function isBlockchainEnabled() {
    return process.env.BLOCKCHAIN_ENABLED === "true";
}

// Network / RPC endpoint (e.g. an Alchemy/Infura/public RPC
// URL for an EVM-compatible test network such as Polygon Amoy).
function getRpcUrl() {
    return process.env.BLOCKCHAIN_RPC_URL || null;
}

// Human-readable network name, used only for logging/metadata
// (never affects which credentials are used).
function getNetworkName() {
    return process.env.BLOCKCHAIN_NETWORK || null;
}

// Wallet private key used to sign/send the hash-anchoring
// transaction. NEVER exposed to the frontend, NEVER logged,
// NEVER returned in any API response.
function getPrivateKey() {
    return process.env.BLOCKCHAIN_PRIVATE_KEY || null;
}

// Optional: address the anchoring transaction is sent to.
// If not set, the service falls back to sending the
// transaction to the wallet's own address, which is a
// common zero-extra-setup way to anchor a hash on-chain.
function getTargetAddress() {
    return process.env.BLOCKCHAIN_TARGET_ADDRESS || null;
}

// =====================================================
// VALIDATION
// =====================================================
// Returns { valid: boolean, missing: string[] }.
// Callers MUST check this before attempting any blockchain
// operation, so misconfiguration fails fast with a clear,
// non-sensitive error instead of a confusing SDK error.
// =====================================================

function validateBlockchainConfig() {
    const missing = [];

    if (!isBlockchainEnabled()) {
        return {
            valid: false,
            enabled: false,
            missing: ["BLOCKCHAIN_ENABLED"],
        };
    }

    if (!getRpcUrl()) missing.push("BLOCKCHAIN_RPC_URL");
    if (!getPrivateKey()) missing.push("BLOCKCHAIN_PRIVATE_KEY");

    return {
        valid: missing.length === 0,
        enabled: true,
        missing,
    };
}

module.exports = {
    isBlockchainEnabled,
    getRpcUrl,
    getNetworkName,
    getPrivateKey,
    getTargetAddress,
    validateBlockchainConfig,
};
