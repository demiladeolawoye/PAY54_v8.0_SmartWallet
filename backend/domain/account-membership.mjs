"use strict";

/* PAY54 Batch 01 / Membership permissions v1.0.0.
 * Caller must supply server-authenticated principal and server-loaded
 * membership. This module is NOT a client-side authentication source. */

import { validateAccountDescriptor } from "./account-model.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLES = Object.freeze({
  PERSONAL_OWNER: Object.freeze(["view", "manage", "initiate"]),
  BUSINESS_OWNER: Object.freeze(["view", "manage", "initiate", "approve"]),
  BUSINESS_ADMIN: Object.freeze(["view", "manage", "initiate"]),
  BUSINESS_OPERATOR: Object.freeze(["view", "initiate"]),
  BUSINESS_VIEWER: Object.freeze(["view"])
});
const MEMBERSHIP_STATUSES = new Set(["ACTIVE", "INVITED", "SUSPENDED", "REVOKED"]);

export function validateAccountMembership(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Membership must be an object");
  const fields = ["accountId", "principalId", "role", "status"];
  if (Object.keys(value).some(key => !fields.includes(key)) || fields.some(key => !Object.hasOwn(value, key)) ||
    !UUID.test(value.accountId) || !UUID.test(value.principalId) ||
    !Object.hasOwn(ROLES, value.role) || !MEMBERSHIP_STATUSES.has(value.status)) {
    throw new TypeError("Invalid account membership");
  }
  return Object.freeze({ accountId: value.accountId.toLowerCase(), principalId: value.principalId.toLowerCase(),
    role: value.role, status: value.status });
}

/* This is an extra domain-policy check, never the sole backend security control.
 * Backend must still enforce authenticated identity, transaction scope,
 * provider eligibility, dual controls and ledger authorization. */
export function authorizeAccountContext({ principalId, account, membership, operation = "view" }) {
  if (typeof principalId !== "string" || !UUID.test(principalId)) return false;
  if (!["view", "manage", "initiate", "approve"].includes(operation)) return false;
  let a, m;
  try {
    a = validateAccountDescriptor(account);
    m = validateAccountMembership(membership);
  } catch {
    return false;
  }
  if (m.principalId !== principalId.toLowerCase() || m.accountId !== a.accountId ||
    m.status !== "ACTIVE" || a.status !== "ACTIVE" || a.verificationStatus !== "VERIFIED") return false;
  if (a.type === "PERSONAL" && (m.role !== "PERSONAL_OWNER" || a.legalOwnerId !== principalId.toLowerCase())) return false;
  if (a.type === "BUSINESS" && m.role === "PERSONAL_OWNER") return false;
  return ROLES[m.role].includes(operation);
}

export function describePermittedOperations({ principalId, account, membership }) {
  return Object.freeze(["view", "manage", "initiate", "approve"].filter(operation =>
    authorizeAccountContext({ principalId, account, membership, operation })));
}

export const PAY54_MEMBERSHIP_ROLES = Object.freeze(Object.keys(ROLES));
