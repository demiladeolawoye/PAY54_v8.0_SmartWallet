"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessBatch10Source,loadBatch10Source} from "../governance/account-batch10-source-audit.mjs";

test("241: current source inventory preserves all Batch 10 denial boundaries",()=>{
 const result=assessBatch10Source(loadBatch10Source());
 assert.equal(result.passed,true,JSON.stringify(result.rules.filter(x=>!x.passed)));
 assert.equal(result.liveCredentialAttested,false);
 assert.equal(result.customerDataAccessEnabled,false);
 assert.equal(result.financialExecutionEnabled,false);
 assert.equal(result.productionRelease,"BLOCKED");
});
test("241: mutation attacks on grants, role switching, audit and review are detected",()=>{
 const inventory=loadBatch10Source();
 const cases=[
  ["roleMigration",s=>s.replace("NOLOGIN NOINHERIT","LOGIN INHERIT")],
  ["rlsMigration",s=>s.replaceAll(
   "AS RESTRICTIVE FOR SELECT TO pay54_account_reader_role USING (false)",
   "AS PERMISSIVE FOR SELECT TO pay54_account_reader_role USING (true)")],
  ["rlsMigration",s=>s+"\nGRANT SELECT ON pay54.account_contexts TO public;"],
  ["custody",s=>s.replace("liveCredentialAttested: false","liveCredentialAttested: true")],
  ["binding",s=>s.replace("!issued.has(value)","false")],
  ["pinnedPool",s=>s.replace("client.release(true)","client.release(false)")],
  ["pinnedPool",s=>s.replace('issued.environment !== "test"','issued.environment === "test"')],
  ["epochGuard",s=>s.replace("await check(issued);\n      return result;","return result;")],
  ["receipt",s=>s.replace("acknowledgement.persistenceConfirmed!==true",
   "acknowledgement.persistenceConfirmed===false")],
  ["auditedRead",s=>s.replace("receipt.receiptAccepted!==true",
   "receipt.receiptAccepted===false")],
  ["sql022",s=>s.replace("ROLLBACK;","COMMIT;")],
  ["sql023",s=>s.replace("ROLLBACK;","COMMIT;")],
  ["sql024",s=>s.replace("'pay54.account_contexts','SELECT'",
   "'pay54.example_synthetic','SELECT'")]
 ];
 for(const [key,mutate] of cases){
  const altered=mutate(inventory[key]);
  assert.notEqual(altered,inventory[key],"Mutation must modify "+key);
  const result=assessBatch10Source({...inventory,[key]:altered});
  assert.equal(result.passed,false,"Failed to detect source downgrade "+key);
 }
});
test("241: missing, wrong-type and truncated inventories deny",()=>{
 const baseline=loadBatch10Source();
 for(const bad of [
  undefined,{},[],{...baseline,custody:null},
  {...baseline,sql024:""}, {...baseline,binding:"x".repeat(80001)}
 ]){
  assert.throws(()=>assessBatch10Source(bad),/BATCH10_SOURCE_INVENTORY_REQUIRED/);
 }
});
