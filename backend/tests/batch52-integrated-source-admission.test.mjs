"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {resolve} from "node:path";
const root=resolve(import.meta.dirname,"../..");
const fixture=p=>readFileSync(resolve(root,p),"utf8");
const files=[
"backend/governance/pay54-cloudsql-cost-assumptions.mjs",
"backend/governance/pay54-gbp-quote-evidence.mjs",
"backend/governance/pay54-wallet-writer-rls-admission.mjs",
"backend/governance/pay54-financial-writer-evidence-gate.mjs",
"backend/governance/pay54-financial-writer-compatibility.mjs",
"backend/governance/pay54-revocation-serialization-contract.mjs",
"backend/src/financial-command-preflight.mjs",
"backend/db/tests/batch22/035_wallet_forward_executor_denial_disposable.sql",
"backend/db/tests/batch22/036_wallet_postrollback_denial_disposable.sql",
"backend/db/tests/batch22/037_financial_writer_identity_catalogue.sql",
"backend/db/tests/batch22/038_financial_writer_invoker_contract.sql",
"backend/db/tests/batch22/039_session_revocation_rowlock_race.sh"
];
test("all reviewed financial artifacts exist",()=>{
 for(const f of files)assert.ok(existsSync(resolve(root,f)),f);
});
test("consolidated workflow retains each financial regression exactly once",()=>{
 const w=fixture(".github/workflows/pay54-batch22-postgres-rls-integration.yml");
 const parts=["035_wallet_forward_executor_denial_disposable.sql",
 "036_wallet_postrollback_denial_disposable.sql",
 "037_financial_writer_identity_catalogue.sql",
 "038_financial_writer_invoker_contract.sql"];
 for(const p of parts)assert.equal(w.split(p).length,2,p);
 assert.equal(w.split("039_session_revocation_rowlock_race.sh").length,3);
 const start=w.indexOf("Apply and reverse reviewed wallet-v1 SQL");
 const forward=w.indexOf("wallet-read-v1-forward-review.sql",start);
 const rollback=w.indexOf("wallet-read-v1-rollback-review.sql",forward);
 assert.ok(start>0&&forward>start&&rollback>forward);
 for(const p of [parts[0],parts[2],parts[3]])
   assert.ok(w.indexOf(p)>forward&&w.indexOf(p)<rollback,p);
 assert.ok(w.indexOf(parts[1])>rollback);
});
test("financial invariant suites run after rollback",()=>{
 const w=fixture(".github/workflows/pay54-batch22-postgres-rls-integration.yml");
 const start=w.indexOf("036_wallet_postrollback_denial_disposable.sql");
 for(const p of ["003_wallet_reservation_integrity.sql",
 "004_reservation_lifecycle_integrity.sql",
 "002_ledger_reversal_integrity.sql"])
  assert.ok(w.indexOf(p,start)>start,p);
});
test("financial command and revocation evidence deny execution",()=>{
 const a=fixture("backend/src/financial-command-preflight.mjs");
 const b=fixture("backend/governance/pay54-revocation-serialization-contract.mjs");
 assert.match(a,/financialExecutionEnabled:false/);
 assert.match(a,/productionAuthorised:false/);
 assert.match(b,/transactionExecutionAuthorised:false/);
 assert.match(b,/productionAuthorised:false/);
});
