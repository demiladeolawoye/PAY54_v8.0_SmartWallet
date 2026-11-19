"use strict";

/**
 * PAY54 Batch 21 / 768 — authoritative account directory projection.
 *
 * Only the trusted server repository may supply account and membership rows.
 * This function does not authenticate a principal, query a database, change an
 * account, issue a session, or authorise money movement. Callers MUST first
 * establish the principal from an authenticated server-side session.
 *
 * Invalid or duplicated authoritative rows fail the entire projection closed;
 * an inconsistent directory must never result in a partial account choice.
 */
import { validateAccountDescriptor } from "./account-model.mjs";
import {
  validateAccountMembership,
  authorizeAccountContext
} from "./account-membership.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = () => { throw new Error("PAY54_ACCOUNT_DIRECTORY_ACCESS_DENIED"); };

export function projectPay54AuthorisedAccountDirectory({
  authenticatedPrincipalId,
  accountsFromTrustedStore,
  membershipsFromTrustedStore
} = {}) {
  if (typeof authenticatedPrincipalId !== "string" ||
      !UUID.test(authenticatedPrincipalId) ||
      !Array.isArray(accountsFromTrustedStore) ||
      !Array.isArray(membershipsFromTrustedStore) ||
      accountsFromTrustedStore.length > 1000 ||
      membershipsFromTrustedStore.length > 1000) fail();

  const principalId = authenticatedPrincipalId.toLowerCase();
  const accounts = new Map();
  const memberships = new Map();

  try {
    for (const row of accountsFromTrustedStore) {
      const account = validateAccountDescriptor(row);
      if (accounts.has(account.accountId)) fail();
      accounts.set(account.accountId, account);
    }
    for (const row of membershipsFromTrustedStore) {
      const membership = validateAccountMembership(row);
      const key = membership.accountId + ":" + membership.principalId;
      if (memberships.has(key)) fail();
      memberships.set(key, membership);
    }
  } catch {
    fail();
  }

  // Only the server-authenticated principal is considered. Other actors'
  // memberships must never grant this principal access to their accounts.
  const visible = [];
  for (const membership of memberships.values()) {
    if (membership.principalId !== principalId) continue;
    const account = accounts.get(membership.accountId);
    if (!account || !authorizeAccountContext({
      principalId, account, membership, operation: "view"
    })) continue;
    visible.push(Object.freeze({
      accountId: account.accountId,
      accountType: account.type,
      displayName: account.displayName,
      role: membership.role,
      financialOperationAuthorised: false
    }));
  }

  visible.sort((a, b) =>
    a.accountType.localeCompare(b.accountType) ||
    a.displayName.localeCompare(b.displayName) ||
    a.accountId.localeCompare(b.accountId));

  return Object.freeze({
    schema: "pay54.authorised-account-directory.v1",
    accounts: Object.freeze(visible),
    requiresAuthenticatedSession: true,
    requiresAuthoritativeDatabaseRls: true,
    accountSwitchCompleted: false,
    productionReady: false
  });
}
