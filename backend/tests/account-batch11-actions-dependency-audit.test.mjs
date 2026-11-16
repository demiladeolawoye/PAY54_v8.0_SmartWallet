"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {assessPay54ActionsDependencyInventory}
 from "../governance/pay54-actions-dependency-audit.mjs";

const path=".github/workflows/pay54-staging-deploy.yml";
const content=readFileSync(new URL("../../"+path,import.meta.url),"utf8");
test("295: existing staging workflow version tags are reported, never approved",()=>{
 const result=assessPay54ActionsDependencyInventory({
  workflows:[{path,content}]
 });
 assert.ok(result.actionCount>=2);
 assert.ok(result.mutableExternalActionCount>=2);
 assert.equal(result.allExternalReferencesImmutable,false);
 assert.equal(result.actionSignatureVerified,false);
 assert.equal(result.deploymentApproved,false);
 assert.equal(result.productionRelease,"BLOCKED");
 assert.ok(result.actions.some(x=>x.actionReference==="actions/checkout@v7"));
 assert.ok(result.actions.some(x=>x.actionReference==="actions/setup-node@v7"));
});
test("295: full immutable commit SHA is distinguishable from a mutable tag",()=>{
 const sha="a".repeat(40);
 const result=assessPay54ActionsDependencyInventory({
  workflows:[{path,content:
   "steps:\n  - uses: actions/checkout@"+sha+
   "\n  - uses: ./local/action\n  - uses: docker://example.io/image@sha256:"+"b".repeat(64)}]
 });
 assert.equal(result.allExternalReferencesImmutable,true);
 assert.equal(result.mutableExternalActionCount,0);
 assert.equal(result.actions.length,3);
});
test("295: unpinned, invalid and mutable Docker actions are flagged",()=>{
 const result=assessPay54ActionsDependencyInventory({
  workflows:[{path,content:
   "steps:\n - uses: actions/checkout\n - uses: docker://test.example/image:latest\n - uses: bad@v1"}]
 });
 assert.equal(result.allExternalReferencesImmutable,false);
 assert.equal(result.mutableExternalActionCount,3);
});
test("295: unsafe inventory, duplicate workflow and oversized content deny",()=>{
 for(const workflows of [
  [],[{path:"../private.yml",content:"yes"}],
  [{path,content:"yes"},{path,content:"no"}],
  [{path,content:"x".repeat(250001)}]
 ]){
  assert.throws(()=>assessPay54ActionsDependencyInventory({workflows}),
   /PAY54_ACTIONS_INVENTORY_INVALID/);
 }
});
