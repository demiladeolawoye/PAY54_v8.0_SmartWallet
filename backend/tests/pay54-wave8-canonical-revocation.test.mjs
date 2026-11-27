"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const race=readFileSync(new URL("../db/tests/batch61/canonical_posting_revocation_race.py",import.meta.url),"utf8");
const workflow=readFileSync(new URL("../../.github/workflows/pay54-batch22-postgres-rls-integration.yml",import.meta.url),"utf8");
test("two physical PostgreSQL sessions must enforce actual lock-before-revoke order",()=>{
 for(const k of ["class Session","subprocess.Popen","PAY54_W8_RESERVED",
 "PAY54_W8_CAPTURED","PAY54_W8_REVOKER_NOT_BLOCKED_BY_FINANCIAL_SESSION_LOCK",
 "wait_event_type='Lock'","PAY54_W8_WRITER_COMMITTED",
 "PAY54_W8_REVOCATION_COMMITTED","PAY54_W8_POST_REVOKE_DENIED",
 "PAY54_W8_TWO_PHYSICAL_SESSIONS_CANONICAL_POSTING_VS_REVOCATION_PASS"])
 assert.ok(race.includes(k),k);
 assert.ok(race.includes("pay54.w7_disposable_attested_money"));
 assert.ok(race.includes("PAY54_W8_CLEANUP_INCOMPLETE"));
});
test("all independently committed disposable financial fixtures are removed",()=>{
 for(const k of ["DISABLE TRIGGER USER","ENABLE TRIGGER USER",
 "DROP OWNED BY pay54_w7_disposable_caller",
 "DROP OWNED BY pay54_w7_disposable_owner","DROP ROLE pay54_w7_disposable_owner",
 "DROP ROLE pay54_w7_disposable_caller","DELETE FROM pay54.ledger_entries",
 "DELETE FROM pay54.financial_operations","DELETE FROM pay54.auth_sessions",
 "PAY54_W8_COMMITTED_DISPOSABLE_FIXTURES_CLEANED_PASS"])
 assert.ok(race.includes(k),k);
});
test("physical race executes between reviewed FORCE RLS forward and rollback",()=>{
 const start=workflow.indexOf("Apply and reverse reviewed wallet-v1 SQL only");
 const fw=workflow.indexOf("backend/db/release/wallet-read-v1-forward-review.sql",start);
 const script=workflow.indexOf("python3 backend/db/tests/batch61/canonical_posting_revocation_race.py",start);
 const rollback=workflow.indexOf("backend/db/release/wallet-read-v1-rollback-review.sql",start);
 assert.ok(start>=0&&fw>start&&script>fw&&rollback>script);
 assert.ok(workflow.includes('PAY54_FINANCIAL_EXECUTION: "false"'));
});
