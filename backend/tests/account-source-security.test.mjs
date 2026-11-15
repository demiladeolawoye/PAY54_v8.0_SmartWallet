"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessAccountSourceSecurity,loadAccountSourceInventory}
 from "../governance/account-source-security.mjs";

test("real account sources preserve canonical query and disabled cloud/money status",()=>{
 const report=assessAccountSourceSecurity(loadAccountSourceInventory());
 assert.equal(report.passed,true,JSON.stringify(report.findings));
 assert.equal(report.cloudProvisioning,"DISABLED");
 assert.equal(report.financialExecution,"DISABLED");
 assert.equal(report.stagingRelease,"BLOCKED");
 assert.equal(report.securityAttestation,"NOT_VERIFIED");
});
test("mutated unsafe SQL, reader drift and unreviewed grants fail closed",()=>{
 const src=loadAccountSourceInventory();
 const mutations=[
  {catalogue:src.catalogue.replace("WHERE m.principal_subject = $1::uuid","WHERE TRUE")},
  {context:src.context.replace('buildAccountQuery("ACCOUNT_LIST"','buildAccountQuery("UNREVIEWED"')},
  {wallet:src.wallet.replace('buildAccountQuery("PERSONAL_WALLET_IDS"','buildAccountQuery("UNREVIEWED"')},
  {policy:src.policy.replace('account-query-catalogue.mjs','untrusted-query.mjs')},
  {migration:src.migration+" GRANT SELECT ON pay54.account_contexts TO pay54_account_reader_role;"},
  {handler:src.handler+"\napp.listen(8080);"}
 ];
 for(const mutation of mutations){
   assert.equal(assessAccountSourceSecurity({...src,...mutation}).passed,false,
     Object.keys(mutation)[0]);
 }
});
test("incomplete security source inventory is rejected",()=>{
 assert.throws(()=>assessAccountSourceSecurity(null),TypeError);
 assert.throws(()=>assessAccountSourceSecurity({catalogue:"SELECT 1"}),TypeError);
});
