"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync(new URL("../db/tests/batch59/001_canonical_session_locked_identity.sql",import.meta.url),"utf8");
const workflow=readFileSync(new URL("../../.github/workflows/pay54-batch22-postgres-rls-integration.yml",import.meta.url),"utf8");
test("canonical identity proof is disposable, rollback-only, and no financial DML",()=>{
 for(const phrase of ["pay54_disposable_ci","BEGIN;","ROLLBACK;",
 "pay54.auth_sessions","FOR UPDATE OF s","session_version",
 "token_digest=p_token_digest","pay54.account_memberships","PAY54_W6_WRONG_TOKEN_ACCEPTED",
 "PAY54_W6_FOREIGN_ACCOUNT_ACCEPTED","PAY54_W6_STALE_SESSION_VERSION_ACCEPTED",
 "PAY54_W6_REVOKED_SESSION_ACCEPTED","PAY54_W6_CANONICAL_AUTH_SESSION_LOCK_PROOF_PASSED"])
 assert.ok(sql.includes(phrase),phrase);
 assert.ok(!/^\s*COMMIT\s*;/m.test(sql));
 assert.ok(!/\b(?:INSERT|UPDATE|DELETE)\s+(?:INTO\s+|FROM\s+)?pay54\.(?:ledger_entries|ledger_journals|balance_reservations|financial_operations)/i.test(sql));
});
test("no activation of canonical writer or financial grants",()=>{
 assert.ok(sql.includes("CREATE FUNCTION pg_temp.pay54_w6_resolve_locked_principal"));
 assert.ok(sql.includes("SECURITY INVOKER"));
 assert.ok(!/\bGRANT\b/i.test(sql));
 assert.ok(!/\bALTER\s+(?:ROLE|FUNCTION)\b/i.test(sql));
 assert.ok(!/^\s*SELECT\s+(?:\*\s+FROM\s+)?pay54\.(?:reserve_wallet_transfer|capture_reserved_wallet_transfer|release_reserved_wallet_transfer)\s*\(/im.test(sql));
});
test("wave6 PostgreSQL proof executes in existing full regression window",()=>{
 const start=workflow.indexOf("Apply and reverse reviewed wallet-v1 SQL only");
 const fw=workflow.indexOf("backend/db/release/wallet-read-v1-forward-review.sql",start);
 const guard=workflow.indexOf("backend/db/tests/batch59/001_canonical_session_locked_identity.sql",start);
 const rollback=workflow.indexOf("backend/db/release/wallet-read-v1-rollback-review.sql",start);
 assert.ok(start>=0&&fw>start&&guard>fw&&rollback>guard);
});
