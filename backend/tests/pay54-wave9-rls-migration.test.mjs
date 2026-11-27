"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const root=new URL("../",import.meta.url);
const read=p=>readFileSync(new URL(p,root),"utf8");
const forward=read("db/release/writer-rls-v1-forward-review.sql");
const back=read("db/release/writer-rls-v1-rollback-review.sql");
const physical=read("db/tests/batch62/001_writer_rls_candidate_denial.sql");
const workflow=read("../.github/workflows/pay54-batch22-postgres-rls-integration.yml");
const roles=["pay54_writer9_owner_candidate","pay54_writer9_caller_candidate"];
test("forward is strictly disposable, deny-only and creates no payment grant",()=>{
 assert.match(forward,/current_database\(\)<>'pay54_disposable_ci'/);
 for(const role of roles)assert.ok(forward.includes("CREATE ROLE "+role+" NOLOGIN NOINHERIT NOSUPERUSER"));
 for(const table of ["wallets","ledger_accounts","ledger_entries","ledger_journals","balance_reservations"])
  assert.match(forward,new RegExp("CREATE POLICY pay54_w9_deny_\\w+ ON pay54\\."+table+"\\s+AS RESTRICTIVE FOR ALL TO pay54_writer9_owner_candidate USING \\(false\\) WITH CHECK \\(false\\)"));
 assert.ok(!/\bGRANT\b/i.test(forward));
 assert.ok(!/\bSECURITY DEFINER\b/i.test(forward));
 assert.ok(!/^\s*ALTER\s+TABLE.*DISABLE\s+ROW\s+LEVEL\s+SECURITY/gim.test(forward));
});
test("rollback is scoped and cannot remove original wallet reader policies",()=>{
 for(const role of roles)assert.ok(back.includes("DROP ROLE "+role));
 assert.ok(back.includes("PAY54_W9_ROLLBACK_SECURITY_DRIFT"));
 assert.ok(back.includes("wallet_read_restricted_v1"));
 assert.ok(!/DROP POLICY pay54_wallet38_/i.test(back));
 assert.ok(!/DISABLE ROW LEVEL SECURITY/i.test(back));
 for(const table of ["wallets","ledger_accounts","ledger_entries","ledger_journals","balance_reservations"])
  assert.ok(back.includes("ON pay54."+table));
});
test("real effective-role deny and CI forward/rollback order",()=>{
 assert.match(physical,/SET LOCAL ROLE pay54_writer9_owner_candidate/);
 assert.match(physical,/PAY54_W9_LEDGER_SELECT_EXPOSED/);
 assert.match(physical,/PAY54_W9_CANONICAL_EXECUTE_EXPOSED/);
 const start=workflow.indexOf("Apply and reverse reviewed wallet-v1 SQL only");
 const fw=workflow.indexOf("backend/db/release/wallet-read-v1-forward-review.sql",start);
 const migration=workflow.indexOf("backend/db/release/writer-rls-v1-forward-review.sql",start);
 const deny=workflow.indexOf("backend/db/tests/batch62/001_writer_rls_candidate_denial.sql",start);
 const rollback=workflow.indexOf("backend/db/release/writer-rls-v1-rollback-review.sql",start);
 const readerRollback=workflow.indexOf("backend/db/release/wallet-read-v1-rollback-review.sql",start);
 assert.ok(start>=0&&fw>start&&migration>fw&&deny>migration&&rollback>deny&&readerRollback>rollback);
 assert.ok(workflow.includes('PAY54_FINANCIAL_EXECUTION: "false"'));
});
