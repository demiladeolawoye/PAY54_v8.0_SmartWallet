"use strict";

/* PAY54 Batch 05 — authoritative source-only account query catalogue.
 * Query text is immutable, fixed and parameterised. No SQL execution, DB
 * credentials, RLS grant, financial access or request identity is created.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const valid = id => typeof id === "string" && UUID.test(id);
const normalize = sql => sql.trim().replace(/\s+/g, " ").toLowerCase();

const accountBase = [
  "SELECT a.id AS account_id, a.legal_owner_subject AS legal_owner_id,",
  "a.account_type AS type, a.display_name, a.status, a.verification_status,",
  "m.principal_subject AS principal_id, m.role, m.status AS membership_status",
  "FROM pay54.account_contexts a",
  "JOIN pay54.account_memberships m ON m.account_id = a.id",
  "WHERE m.principal_subject = $1::uuid",
  "AND m.status = 'ACTIVE'",
  "AND a.status = 'ACTIVE'",
  "AND a.verification_status = 'VERIFIED'"
];
const accountTail = ["ORDER BY a.created_at, a.id", "LIMIT 100"];

const QUERY = Object.freeze({
  ACCOUNT_LIST: [...accountBase,...accountTail].join("\n"),
  ACCOUNT_SELECT: [...accountBase,"AND a.id = $2::uuid",...accountTail].join("\n"),
  PERSONAL_WALLET_IDS: [
    "SELECT a.id AS account_id, a.legal_owner_subject AS owner_id,",
    "a.account_type, a.display_name, a.status AS account_status,",
    "a.verification_status, m.principal_subject, m.role,",
    "m.status AS membership_status, w.id AS wallet_id,",
    "w.owner_subject AS wallet_owner, w.status AS wallet_status,",
    "b.account_id AS binding_account_id, b.wallet_id AS binding_wallet_id",
    "FROM pay54.account_contexts a",
    "JOIN pay54.account_memberships m ON m.account_id=a.id",
    "JOIN pay54.personal_wallet_bindings b ON b.account_id=a.id",
    "JOIN pay54.wallets w ON w.id=b.wallet_id",
    "WHERE a.id=$1::uuid AND m.principal_subject=$2::uuid",
    "AND a.account_type='PERSONAL' AND a.status='ACTIVE'",
    "AND a.verification_status='VERIFIED' AND m.status='ACTIVE'",
    "AND w.status='ACTIVE' AND w.owner_subject=a.legal_owner_subject",
    "ORDER BY w.id LIMIT 100"
  ].join("\n")
});

const allowed = Object.freeze(Object.entries(QUERY).map(([id,sql]) =>
  Object.freeze({id,sql,canonical:normalize(sql)})));
if (new Set(allowed.map(q => q.canonical)).size !== allowed.length) {
  throw new Error("Duplicate PAY54 account query definitions");
}

export const PAY54_ACCOUNT_QUERIES = QUERY;

export function getAccountQuery(id) {
  if (!Object.hasOwn(QUERY,id)) throw new Error("UNAPPROVED_ACCOUNT_QUERY");
  return QUERY[id];
}

export function buildAccountQuery(id,principalId,accountId=null) {
  if (!valid(principalId)) throw new Error("ACCOUNT_AUTH_REQUIRED");
  const principal = principalId.toLowerCase();
  let params;
  if (id === "ACCOUNT_LIST" && accountId === null) {
    params = [principal];
  } else if (id === "ACCOUNT_SELECT" && valid(accountId)) {
    params = [principal,accountId.toLowerCase()];
  } else if (id === "PERSONAL_WALLET_IDS" && valid(accountId)) {
    params = [accountId.toLowerCase(),principal];
  } else {
    throw new Error("UNAPPROVED_ACCOUNT_QUERY");
  }
  return Object.freeze({id,sql:getAccountQuery(id),params:Object.freeze(params)});
}

export function identifyAccountQuery(sql) {
  if (typeof sql !== "string" || sql.length > 4096) return null;
  const key = normalize(sql);
  const found = allowed.find(query => query.canonical === key);
  return found?.id ?? null;
}
