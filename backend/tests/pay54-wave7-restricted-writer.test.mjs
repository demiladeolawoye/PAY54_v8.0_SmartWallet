"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync(new URL("../db/tests/batch60/001_disposable_restricted_canonical_writer.sql",import.meta.url),"utf8");
const ci=readFileSync(new URL("../../.github/workflows/pay54-batch22-postgres-rls-integration.yml",import.meta.url),"utf8");
test("non-superuser wrapper is only money execution entrypoint for disposable app caller",()=>{
 for(const s of ["pay54_disposable_ci","CREATE ROLE pay54_w7_disposable_owner NOLOGIN",
 "CREATE ROLE pay54_w7_disposable_caller NOLOGIN","NOBYPASSRLS",
 "CREATE FUNCTION pay54.w7_disposable_attested_money",
 "LANGUAGE plpgsql SECURITY DEFINER","SET LOCAL ROLE pay54_w7_disposable_caller",
 "REVOKE CREATE ON SCHEMA pay54 FROM pay54_w7_disposable_owner",
 "FOR UPDATE OF s","session_version=p_version",
 "pay54.account_memberships","PAY54_W7_DISPOSABLE_PRIVILEGE_GRAPH_INVALID"])assert.ok(sql.includes(s),s);
 assert.ok(sql.includes("GRANT EXECUTE ON FUNCTION pay54.w7_disposable_attested_money"));
 assert.ok(!/GRANT EXECUTE ON FUNCTION pay54\.reserve_wallet_transfer[\s\S]{0,220}TO pay54_w7_disposable_caller/.test(sql));
});
test("positive canonical money and strict negative cases are part of same test",()=>{
 for(const s of ["pay54.reserve_wallet_transfer","pay54.capture_reserved_wallet_transfer",
 "pay54.release_reserved_wallet_transfer","PAY54_W7_IDEMPOTENCY_FAILED",
 "PAY54_W7_FOREIGN_TOKEN_ACCEPTED","PAY54_W7_STALE_VERSION_ACCEPTED",
 "PAY54_W7_FINANCIAL_INVARIANT_FAILED",
 "journal_count<>1","outbox_count<>4","zero_sum<>0",
 "PAY54_W7_ROLLBACK_INCOMPLETE","ROLLBACK;"])
 assert.ok(sql.includes(s),s);
 assert.ok(!/^\s*COMMIT\s*;/m.test(sql));
});
test("full PG16 integration runs positive disposable test between read RLS forward and rollback",()=>{
 const start=ci.indexOf("Apply and reverse reviewed wallet-v1 SQL only");
 const forward=ci.indexOf("backend/db/release/wallet-read-v1-forward-review.sql",start);
 const suite=ci.indexOf("backend/db/tests/batch60/001_disposable_restricted_canonical_writer.sql",start);
 const back=ci.indexOf("backend/db/release/wallet-read-v1-rollback-review.sql",start);
 assert.ok(forward>start&&suite>forward&&back>suite);
 assert.ok(ci.includes('PAY54_FINANCIAL_EXECUTION: "false"'));
});
