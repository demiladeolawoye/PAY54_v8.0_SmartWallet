"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const sql=readFileSync(new URL("../db/tests/batch53/001_restricted_writer_canary_disposable.sql",import.meta.url),"utf8");
const workflow=readFileSync(new URL("../../.github/workflows/pay54-batch22-postgres-rls-integration.yml",import.meta.url),"utf8");
test("test must be disposable, transactional and rollback all additions",()=>{
 for(const line of ["pay54_disposable_ci","BEGIN;","ROLLBACK;","PAY54_B53_CANARY_ROLLBACK_LEAK",
 "CREATE ROLE pay54_b53_canary_writer NOLOGIN","FORCE ROW LEVEL SECURITY"])
 assert.ok(sql.includes(line),line);
 assert.equal(sql.includes("COMMIT;"),false);
});
test("exercise real non-superuser role with a positive scope update and denial checks",()=>{
 for(const line of ["SET LOCAL ROLE pay54_b53_canary_writer","PAY54_B53_POSITIVE_WRITE_FAILED",
 "PAY54_B53_FOREIGN_WRITE_ALLOWED","PAY54_B53_CANONICAL_MONEY_ACCESS_LEAK",
 "PAY54_B53_INSERT_UNEXPECTEDLY_ALLOWED","RESET ROLE"])
 assert.ok(sql.includes(line),line);
});
test("CI only executes canary with explicit disabled-money environment",()=>{
 assert.ok(workflow.includes("backend/db/tests/batch53/001_restricted_writer_canary_disposable.sql"));
 assert.ok(workflow.includes("PAY54_FINANCIAL_EXECUTION: \"false\""));
 assert.ok(workflow.includes("PAY54_ENVIRONMENT: DISPOSABLE_CI"));
});
