"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {assessPay54PullRequestWorkflowTrust}
 from "../governance/pay54-pr-workflow-trust-audit.mjs";
const path=".github/workflows/pay54-batch11-publication-governance.yml";
const baseline=readFileSync(new URL("../../"+path,import.meta.url),"utf8");
test("299: existing low-privilege source checks do not claim independent approval",()=>{
 const result=assessPay54PullRequestWorkflowTrust({
  workflows:[{path,content:baseline}]
 });
 assert.equal(result.workflowsReviewed,1);
 assert.equal(result.highRiskWorkflowCount,0);
 assert.equal(result.sourceHeuristicsClear,true);
 assert.equal(result.yamlSemanticsIndependentlyVerified,false);
 assert.equal(result.protectedBranchSettingsVerified,false);
 assert.equal(result.releaseAuthorized,false);
 assert.equal(result.productionRelease,"BLOCKED");
});
test("299: privileged pull_request_target and write token are reported",()=>{
 const results=assessPay54PullRequestWorkflowTrust({workflows:[{
  path,content:baseline.replace("  pull_request:","  pull_request_target:")
    .replace("contents: read","contents: write")
 }]});
 assert.equal(results.findings[0].pullRequestTarget,true);
 assert.equal(results.findings[0].writePermissionDetected,true);
 assert.equal(results.highRiskWorkflowCount,1);
});
test("299: workflow_run with credentials and unsafe PR secrets are reported",()=>{
 for(const source of [
  "on:\n  workflow_run:\n    workflows: [build]\nsteps:\n  - uses: actions/checkout@v6\n",
  "on:\n  pull_request:\nsteps:\n  - run: echo " + "$" + "{{ secrets.API_TEST_VALUE }}\n",
  "on:\n  pull_request:\npermissions:\n  id-token: write\n"
 ]){
  const report=assessPay54PullRequestWorkflowTrust({
   workflows:[{path,content:source}]
  });
  assert.equal(report.highRiskWorkflowCount,1);
 }
});
test("299: absent credential-persistence guard flags checkout even on push",()=>{
 const report=assessPay54PullRequestWorkflowTrust({
  workflows:[{path,content:"on:\n  push:\nsteps:\n  - uses: actions/checkout@v6\n"}]
 });
 assert.equal(report.highRiskWorkflowCount,1);
});
test("299: duplicate, path traversal and invalid source inventories are rejected",()=>{
 for(const workflows of [
  [],[{path:"../github/workflows/deploy.yml",content:baseline}],
  [{path,content:baseline},{path,content:baseline}],
  [{path,content:"x".repeat(250001)}]
 ]){
  assert.throws(()=>assessPay54PullRequestWorkflowTrust({workflows}),
   /PAY54_WORKFLOW_TRUST_INVENTORY_INVALID/);
 }
});

test("304: untrusted PR title, body and branch expressions are flagged",()=>{
 for(const field of [
  "github.event.pull_request.title",
  "github.event.pull_request.body",
  "github.event.pull_request.head.ref",
  "github.head_ref",
  "github.event.workflow_run.head_branch"
 ]){
  const trigger=field.includes("workflow_run")?"workflow_run":"pull_request";
  const expression="$"+"{{ "+field+" }}";
  const report=assessPay54PullRequestWorkflowTrust({
   workflows:[{path,content:"on:\n  "+trigger+":\nsteps:\n  - run: echo "+expression+"\n"}]
  });
  assert.equal(report.highRiskWorkflowCount,1,field);
  assert.equal(report.findings[0].untrustedExpressionDetected,true);
  assert.equal(report.releaseAuthorized,undefined);
  assert.equal(report.productionRelease,"BLOCKED");
 }
});
test("304: an unrelated expression without risky triggers does not pass for an independent security review",()=>{
 const report=assessPay54PullRequestWorkflowTrust({
  workflows:[{path,content:"on:\n  push:\nsteps:\n  - run: echo ok\n"}]
 });
 assert.equal(report.highRiskWorkflowCount,0);
 assert.equal(report.githubEnvironmentRulesVerified,false);
 assert.equal(report.releaseAuthorized,false);
});
