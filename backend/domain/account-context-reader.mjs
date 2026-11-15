"use strict";

/* PAY54 implementation 16 — read-only backend account repository contract.
 * Caller supplies trusted backend-authenticated identity and read-only DB.
 * No HTTP endpoint, no privileges, no financial or cloud activation. */

import { validateAccountDescriptor } from "./account-model.mjs";
import { buildAccountQuery } from "../db/account-query-catalogue.mjs";
import { validateAccountMembership, authorizeAccountContext } from "./account-membership.mjs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = value => typeof value === "string" && UUID.test(value);

function mapRow(row) {
  const account = validateAccountDescriptor({
    accountId: row.account_id,
    legalOwnerId: row.legal_owner_id,
    type: row.type,
    displayName: row.display_name,
    status: row.status,
    verificationStatus: row.verification_status
  });
  const membership = validateAccountMembership({
    accountId: row.account_id,
    principalId: row.principal_id,
    role: row.role,
    status: row.membership_status
  });
  return { account, membership };
}

export function createAccountContextReader({ query, resolveAuthenticatedPrincipal }) {
  if (typeof query !== "function" || typeof resolveAuthenticatedPrincipal !== "function") {
    throw new TypeError("Trusted backend query and identity resolver required");
  }

  const load = async (request, accountId = null) => {
    const principal = await resolveAuthenticatedPrincipal(request);
    if (!isUuid(principal)) throw new Error("ACCOUNT_AUTH_REQUIRED");
    if (accountId !== null && !isUuid(accountId)) throw new Error("INVALID_ACCOUNT_ID");

    const canonicalList = accountId === null ? buildAccountQuery("ACCOUNT_LIST",principal) : null;
    const sql = canonicalList?.sql ?? [
      "SELECT a.id AS account_id, a.legal_owner_subject AS legal_owner_id,",
      " a.account_type AS type, a.display_name, a.status, a.verification_status,",
      " m.principal_subject AS principal_id, m.role, m.status AS membership_status",
      "FROM pay54.account_contexts a",
      "JOIN pay54.account_memberships m ON m.account_id = a.id",
      "WHERE m.principal_subject = $1::uuid",
      "AND m.status = 'ACTIVE'",
      "AND a.status = 'ACTIVE'",
      "AND a.verification_status = 'VERIFIED'",
      accountId === null ? "" : "AND a.id = $2::uuid",
      "ORDER BY a.created_at, a.id",
      "LIMIT 100"
    ].filter(Boolean).join("\n");

    const values = accountId === null
      ? canonicalList.params
      : [principal.toLowerCase(), accountId.toLowerCase()];

    const result = await query(sql, values);
    if (!result || !Array.isArray(result.rows)) throw new Error("ACCOUNT_STORE_UNAVAILABLE");

    const allowed = [];
    for (const row of result.rows) {
      const mapped = mapRow(row);
      if ((accountId === null || mapped.account.accountId === accountId.toLowerCase()) &&
        authorizeAccountContext({
          principalId: principal,
          account: mapped.account,
          membership: mapped.membership,
          operation: "view"
        })) allowed.push(mapped.account);
    }
    return Object.freeze(allowed);
  };

  return Object.freeze({
    listForRequest: request => load(request),
    selectForRequest: async (request, accountId) => {
      const accounts = await load(request, accountId);
      if (accounts.length !== 1) throw new Error("ACCOUNT_NOT_AVAILABLE");
      return accounts[0];
    }
  });
}
