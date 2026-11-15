"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { assertAccountReadStatement } from "../db/account-sql-policy.mjs";
import { readFileSync } from "node:fs";

const P="11111111-1111-4111-8111-111111111111";
const A="22222222-2222-4222-8222-222222222222";

const LIST=[
"SELECT a.id AS account_id, a.legal_owner_subject AS legal_owner_id,",
" a.account_type AS type, a.display_name, a.status, a.verification_status,",
" m.principal_subject AS principal_id, m.role, m.status AS membership_status",
"FROM pay54.account_contexts a",
"JOIN pay54.account_memberships m ON m.account_id = a.id",
"WHERE m.principal_subject = $1::uuid",
"AND m.status = 'ACTIVE'",
"AND a.status = 'ACTIVE'",
"AND a.verification_status = 'VERIFIED'",
"ORDER BY a.created_at, a.id",
"LIMIT 100"
].join("\n");
const SELECT=LIST.replace("ORDER BY a.created_at", "AND a.id = $2::uuid\nORDER BY a.created_at");

test("list and selection SQL shapes are bound to authenticated principal",()=>{
 assert.equal(assertAccountReadStatement(LIST,[P],P),true);
 assert.equal(assertAccountReadStatement(SELECT,[P,A],P),true);
});
test("query mutation and invalid parameters fail closed",()=>{
 for(const sql of [
  LIST+"; DROP TABLE pay54.wallets;",
  LIST.replace("LIMIT 100","LIMIT 1000"),
  LIST.replace("FROM pay54.account_contexts","FROM pay54.ledger_entries"),
  LIST.replace("m.status = 'ACTIVE'","m.status <> 'ACTIVE'"),
  LIST.replace("WHERE m.principal_subject = $1::uuid","WHERE 1=1"),
  "SELECT * FROM pay54.account_contexts"
 ]){
   assert.throws(()=>assertAccountReadStatement(sql,[P],P),/UNAPPROVED_ACCOUNT_QUERY/);
 }
 assert.throws(()=>assertAccountReadStatement(LIST,[A],P),/UNAPPROVED_ACCOUNT_QUERY/);
 assert.throws(()=>assertAccountReadStatement(SELECT,[P,"bad"],P),/UNAPPROVED_ACCOUNT_QUERY/);
 assert.throws(()=>assertAccountReadStatement(LIST,[P,P],P),/UNAPPROVED_ACCOUNT_QUERY/);
});
test("source-maintained account SQL still contains critical scoped restrictions",()=>{
 const reader=readFileSync(new URL("../domain/account-context-reader.mjs",import.meta.url),"utf8");
 assert.match(reader,/m\.principal_subject = \$1::uuid/);
 assert.match(reader,/a\.id = \$2::uuid/);
 const wallet=readFileSync(new URL("../domain/account-wallet-reader.mjs",import.meta.url),"utf8");
 assert.match(wallet,/m\.principal_subject=\$2::uuid/);
});
