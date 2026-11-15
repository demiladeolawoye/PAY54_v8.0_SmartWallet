"use strict";

/* Minimum disclosure for an account picker. No legal-owner UUID, role, balance,
 * verification documents, internal flags or credentials may be exposed. */
import { validateAccountDescriptor } from "./account-model.mjs";

export function projectAccountForSwitcher(raw) {
  const account = validateAccountDescriptor(raw);
  if (account.status !== "ACTIVE" || account.verificationStatus !== "VERIFIED") {
    throw new Error("ACCOUNT_NOT_AVAILABLE");
  }
  return Object.freeze({
    accountId: account.accountId,
    type: account.type,
    displayName: account.displayName
  });
}

export function projectAccountList(raw) {
  if (!Array.isArray(raw) || raw.length > 100) {
    throw new TypeError("Account list must be bounded");
  }
  const seen = new Set();
  const result=[];
  for(const account of raw){
    const projected=projectAccountForSwitcher(account);
    if(seen.has(projected.accountId))throw new Error("DUPLICATE_ACCOUNT_CONTEXT");
    seen.add(projected.accountId);
    result.push(projected);
  }
  return Object.freeze(result);
}
