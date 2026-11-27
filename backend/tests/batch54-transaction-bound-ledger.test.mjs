"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync(new URL("../db/tests/batch54/001_transaction_bound_synthetic_ledger.sql",import.meta.url),"utf8");
const wf=readFileSync(new URL("../../.github/workflows/pay54-batch22-postgres-rls-integration.yml",import.meta.url),"utf8");
test("the financial proof is disposable, isolated, and rolled back",()=>{
 for(const v of ["pay54_disposable_ci","BEGIN;","ROLLBACK;","pay54_b54_writer NOLOGIN",
 "NOBYPASSRLS","ALTER TABLE pay54_b54.sessions FORCE ROW LEVEL SECURITY",
 "ALTER TABLE pay54_b54.entries FORCE ROW LEVEL SECURITY",
 "PAY54_B54_ROLLBACK_FAILED"])assert.ok(sql.includes(v),v);
 assert.ok(!/^\s*COMMIT\s*;/m.test(sql));
 assert.ok(!/\bGRANT\s+(?:SELECT|INSERT|UPDATE|DELETE)\s+ON\s+pay54\./i.test(sql));
});
test("restricted effective writer and invoker keep journal, outbox and session atomic",()=>{
 for(const v of ["SET LOCAL ROLE pay54_b54_writer","SECURITY INVOKER",
 "FOR UPDATE","pay54_b54.entries","pay54_b54.outbox",
 "PAY54_B54_LEDGER_OR_OUTBOX_INVARIANT_FAILED","PAY54_B54_REVOKED_SESSION_ACCEPTED",
 "PAY54_B54_CANONICAL_FINANCIAL_PRIVILEGE_LEAK"])
 assert.ok(sql.includes(v),v);
});
test("replay, overspend, cross-owner and rollback denials are mandatory",()=>{
 for(const v of ["PAY54_B54_CONFLICTING_REPLAY_ACCEPTED","PAY54_B54_FOREIGN_ACCOUNT_ACCEPTED",
 "PAY54_B54_OVERSPEND_ACCEPTED","PAY54_B54_ROLLBACK_FAILED"])
 assert.ok(sql.includes(v),v);
});
test("disposable workflow executes batch54 with real PostgreSQL and disabled money flag",()=>{
 assert.ok(wf.includes("backend/db/tests/batch54/001_transaction_bound_synthetic_ledger.sql"));
 assert.ok(wf.includes("PAY54_FINANCIAL_EXECUTION: \"false\""));
 assert.ok(wf.includes("PAY54_ENVIRONMENT: DISPOSABLE_CI"));
});
