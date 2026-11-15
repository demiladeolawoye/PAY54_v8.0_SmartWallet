"use strict";

/* PAY54 Batch 04 — defensive query-template classifier.
 * Only the two exact account repository shapes are accepted, as originally
 * constructed by the trusted backend. Parameter binding remains mandatory.
 * This gate does not substitute for PostgreSQL role and RLS enforcement.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Whitespace normalisation is safe for these static source-controlled queries:
// no string literal contains variable whitespace or dynamically injected text.
const normalize=s=>s.trim().replace(/\s+/g," ").toLowerCase();

const ACCOUNT_BASE=[
  "SELECT a.id AS account_id, a.legal_owner_subject AS legal_owner_id,",
  " a.account_type AS type, a.display_name, a.status, a.verification_status,",
  " m.principal_subject AS principal_id, m.role, m.status AS membership_status",
  "FROM pay54.account_contexts a",
  "JOIN pay54.account_memberships m ON m.account_id = a.id",
  "WHERE m.principal_subject = $1::uuid",
  "AND m.status = 'ACTIVE'",
  "AND a.status = 'ACTIVE'",
  "AND a.verification_status = 'VERIFIED'"
];
const ACCOUNT_TAIL=["ORDER BY a.created_at, a.id","LIMIT 100"];
const ACCOUNT_LIST=normalize([...ACCOUNT_BASE,...ACCOUNT_TAIL].join(" "));
const ACCOUNT_SELECT=normalize([...ACCOUNT_BASE,"AND a.id = $2::uuid",...ACCOUNT_TAIL].join(" "));
const WALLET_SQL=normalize([
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
].join(" "));

export function assertAccountReadStatement(sql,params,principalId){
  if(typeof sql!=="string"||sql.length>4096||!Array.isArray(params)||
     typeof principalId!=="string"||!UUID.test(principalId)){
    throw new Error("UNAPPROVED_ACCOUNT_QUERY");
  }
  const shape=normalize(sql);
  const values=params.map(value=>typeof value==="string"?value.toLowerCase():null);
  const principal=principalId.toLowerCase();
  const allValid=values.every(value=>value!==null&&UUID.test(value));
  if(!allValid)throw new Error("UNAPPROVED_ACCOUNT_QUERY");
  if(shape===ACCOUNT_LIST && values.length===1 && values[0]===principal)return true;
  if(shape===ACCOUNT_SELECT && values.length===2 && values[0]===principal)return true;
  if(shape===WALLET_SQL && values.length===2 && values[1]===principal)return true;
  throw new Error("UNAPPROVED_ACCOUNT_QUERY");
}
