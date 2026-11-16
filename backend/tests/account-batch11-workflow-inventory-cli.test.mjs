"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync}
 from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {inspectPay54WorkflowSources}
 from "../governance/pay54-workflow-inventory-cli.mjs";

function fixture(fn){
 const root=mkdtempSync(join(tmpdir(),"pay54-workflows-"));
 const workflows=join(root,".github","workflows");
 mkdirSync(workflows,{recursive:true});
 try{return fn({root,workflows});}
 finally{rmSync(root,{recursive:true,force:true});}
}
test("301: checkout discovery audits actual approved workflow files",()=>{
 const result=inspectPay54WorkflowSources();
 assert.ok(result.workflowCount>=20);
 assert.equal(result.inventoryReviewedFromDisk,true);
 assert.equal(result.githubPagesSettingsVerified,false);
 assert.equal(result.publicationApproved,false);
 assert.equal(result.productionRelease,"BLOCKED");
 assert.equal(result.financialExecutionEnabled,false);
 assert.ok(result.mutableExternalActionCount>0);
 assert.ok(result.workflows.includes(".github/workflows/pay54-staging-deploy.yml"));
 assert.ok(Object.isFrozen(result.mutableReferences));
});
test("301: reviewed directory includes untrusted trigger and mutable tag findings",()=>{
 fixture(({root,workflows})=>{
  writeFileSync(join(workflows,"example.yml"),
   "on:\n  pull_request_target:\npermissions:\n  contents: write\nsteps:\n  - uses: actions/checkout@v6\n");
  const result=inspectPay54WorkflowSources(root);
  assert.equal(result.workflowCount,1);
  assert.equal(result.highRiskWorkflowCount,1);
  assert.equal(result.mutableExternalActionCount,1);
  assert.equal(result.flaggedWorkflowPaths[0],
   ".github/workflows/example.yml");
  assert.equal(result.stagingRelease,"BLOCKED");
 });
});
test("301: no workflow, symlink and oversized source fail closed",()=>{
 fixture(({root})=>{
  assert.throws(()=>inspectPay54WorkflowSources(root),
   /PAY54_WORKFLOW_DISCOVERY_INVALID/);
 });
 fixture(({root,workflows})=>{
  writeFileSync(join(root,"external.yml"),"on: push");
  symlinkSync(join(root,"external.yml"),join(workflows,"linked.yml"));
  assert.throws(()=>inspectPay54WorkflowSources(root),
   /PAY54_WORKFLOW_DISCOVERY_INVALID/);
 });
 fixture(({root,workflows})=>{
  writeFileSync(join(workflows,"oversized.yml"),"x".repeat(250001));
  assert.throws(()=>inspectPay54WorkflowSources(root),
   /PAY54_WORKFLOW_DISCOVERY_INVALID/);
 });
});
