"use strict";

/**
 * CR-PAYTAG-01 / source-only canonical PayTag syntax contract.
 *
 * No registration, ownership proof, lookup, recipient disclosure, contact
 * persistence, database access, authorisation, money movement or issuance.
 * A trusted PostgreSQL registry must enforce uniqueness and lifecycle rules.
 */

const MIN_LENGTH = 3;
const MAX_LENGTH = 24;
const SAFE_ALIAS = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const RESERVED = new Set([
  "admin", "administrator", "api", "billing", "compliance",
  "fraud", "help", "identity", "legal", "official", "pay54",
  "payment", "payments", "root", "security", "staff", "support",
  "system", "trust", "verified", "wallet"
]);

export const PAY54_PAYTAG_CONTRACT = Object.freeze({
  schema: "pay54.paytag-identity-contract.v1",
  minimumLength: MIN_LENGTH,
  maximumLength: MAX_LENGTH,
  prefix: "@",
  currencyBinding: "NONE",
  directoryDiscoveryEnabled: false,
  publicAccountNumberDisclosure: false,
  accountOrWalletOwnershipVerified: false,
  tagRegistrationEnabled: false,
  recipientResolutionEnabled: false,
  financialExecutionEnabled: false,
  productionRelease: "BLOCKED"
});

/**
 * Produces only a syntax-normalised, non-authoritative alias.
 * ASCII-only syntax rejects Unicode confusables by design.
 * Never use this output alone to register, reserve, resolve or pay a tag.
 */
export function normalisePay54PayTag(value) {
  if (typeof value !== "string") {
    throw new TypeError("PAYTAG_INVALID");
  }
  if (value.length === 0 || value !== value.trim() || value.includes("\u0000")) {
    throw new TypeError("PAYTAG_INVALID");
  }
  const raw = value.startsWith("@") ? value.slice(1) : value;
  if (raw.length < MIN_LENGTH || raw.length > MAX_LENGTH || !/^[\x00-\x7f]+$/.test(raw)) {
    throw new TypeError("PAYTAG_INVALID");
  }
  const canonical = raw.toLowerCase();
  if (!SAFE_ALIAS.test(canonical)) {
    throw new TypeError("PAYTAG_INVALID");
  }
  if (RESERVED.has(canonical) || canonical.startsWith("pay54-") ||
      canonical.startsWith("pay54_") || canonical.startsWith("pay54.")) {
    // Keep reserved and claimed names indistinguishable in external APIs.
    throw new TypeError("PAYTAG_UNAVAILABLE");
  }
  return Object.freeze({
    schema: "pay54.paytag-syntax.v1",
    canonical,
    display: "@" + canonical,
    ownershipVerified: false,
    availableForClaim: null,
    recipientVerified: false,
    financialExecutionEnabled: false
  });
}

/**
 * Build a strictly presentation-only account number preview.
 * Currency, partner and account ownership must be verified elsewhere.
 */
export function maskPay54AccountNumber(value) {
  if (typeof value !== "string" || value.length === 0 ||
      value.length > 64 || !/^[A-Za-z0-9 -]+$/.test(value)) {
    throw new TypeError("ACCOUNT_DISPLAY_INVALID");
  }
  const compact = value.replace(/[ -]/g, "");
  if (compact.length < 6 || compact.length > 34 ||
      !/^[A-Za-z0-9]+$/.test(compact)) {
    throw new TypeError("ACCOUNT_DISPLAY_INVALID");
  }
  return "•••• " + compact.slice(-4).toUpperCase();
}
