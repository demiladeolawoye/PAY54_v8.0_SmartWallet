"use strict";

/*
 * CR-PAYTAG-01 P1 readiness assessment, not registry or transfer execution.
 *
 * Reuses existing canonical account and wallet scope policies; does not
 * duplicate identity rules, persist aliases, resolve recipients or post funds.
 * PostgreSQL uniqueness, authenticated ownership and trust remain necessary.
 */

import {normalisePay54PayTag} from "./paytag-identity-contract.mjs";
import {evaluatePersonalWalletAccess} from "./account-wallet-eligibility.mjs";

function deny(reason) {
  return Object.freeze({
    permittedForRegistryDesignReview: false,
    reason,
    proposedAlias: null,
    accountId: null,
    walletId: null,
    registryWriteAuthorised: false,
    recipientResolutionAuthorised: false,
    financialExecutionEnabled: false,
    productionRelease: "BLOCKED"
  });
}

export function assessPay54PersonalPayTagClaimReadiness({
  principalId, account, membership, wallet, binding, proposedTag
} = {}) {
  let alias;
  try {
    alias = normalisePay54PayTag(proposedTag);
  } catch {
    return deny("INVALID_OR_UNAVAILABLE_TAG");
  }
  let eligibility;
  try {
    eligibility = evaluatePersonalWalletAccess({
      principalId, account, membership, wallet, binding
    });
  } catch {
    return deny("ACCOUNT_SCOPE_DENIED");
  }
  if (!eligibility?.allowed ||
      eligibility.financialExecutionEnabled !== false ||
      typeof eligibility.accountId !== "string" ||
      typeof eligibility.walletId !== "string") {
    return deny("ACCOUNT_SCOPE_DENIED");
  }
  return Object.freeze({
    permittedForRegistryDesignReview: true,
    reason: "SOURCE_ELIGIBLE_UNVERIFIED_REGISTRY",
    proposedAlias: alias.canonical,
    accountId: eligibility.accountId,
    walletId: eligibility.walletId,
    registryWriteAuthorised: false,
    recipientResolutionAuthorised: false,
    financialExecutionEnabled: false,
    productionRelease: "BLOCKED"
  });
}

/**
 * Make the policy boundaries machine-checkable without a database.
 * A verified owner still cannot claim, update, search or reserve an alias.
 */
export const PAY54_PAYTAG_REGISTRY_READINESS = Object.freeze({
  schema: "pay54.paytag-registry-readiness.v1",
  requiredDatabase: "PostgreSQL",
  canonicalNamespaceUniquenessVerified: false,
  databaseOwnershipVerified: false,
  accountIsolationVerifiedInRuntime: false,
  allowedAccountTypes: Object.freeze(["PERSONAL"]),
  businessAliasIssuanceApproved: false,
  optimisticClientClaimsAccepted: false,
  registryWriteAuthorised: false,
  recipientResolutionAuthorised: false,
  financialExecutionEnabled: false,
  productionRelease: "BLOCKED"
});
