"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {verifyPay54ProtectedBranchBaseline as inspect,
 inspectPay54ProtectedBranchBaselineCheckout as checkout,
 verifyPay54PrDiffIdentity as identity}
 from "../release/pay54-protected-branch-baseline.mjs";

const workflow=readFileSync(new URL(
 "../../.github/workflows/pay54-protected-branch-baseline.yml",
 import.meta.url),"utf8");

test("1238: common CI is unfiltered for main and project-titan PRs",()=>{
 const r=checkout();
 assert.equal(r.jobContext,"PAY54 Protected Branch Security");
 assert.equal(r.pathsFiltered,false);
 assert.deepEqual([...r.prTargets.slice(0,2)],["main","project-titan"]);
 assert.equal(r.targetBaseBranchesActuallyTested,false);
 assert.equal(r.requiredCheckConfiguredInGithub,false);
 assert.equal(r.rulesetEnforcementAuthorised,false);
});
test("1238: code execution and workflow privileges remain read-only",()=>{
 const r=inspect({workflow});
 assert.equal(r.sourceActionsPinned,true);
 assert.equal(r.nonDeploying,true);
 assert.equal(r.productionReleaseAuthorised,false);
});
test("1238: path filters, pull_request_target and write tokens cannot be required",()=>{
 for(const malicious of [
  workflow.replace("  workflow_dispatch:",
   "    paths:\n      - backend/**\n  workflow_dispatch:"),
  workflow.replace("  workflow_dispatch:","  pull_request_target:\n  workflow_dispatch:"),
  workflow.replace("  contents: read","  contents: write"),
  workflow.replace("  contents: read","  contents: read\n  id-token: write"),
  workflow.replace("actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803",
   "actions/checkout@v6"),
  workflow.replace("  workflow_dispatch:","  workflow_dispatch:\n  workflow_run:"),
  workflow+"\n      - uses: actions/deploy-pages@deadbeef\n",
  workflow.replace("fetch-depth: 0","fetch-depth: 1")
 ])assert.throws(()=>inspect({workflow:malicious}),
  /PROTECTED_BRANCH_BASELINE_DENIED/);
});
test("1238: PR source must match checkout and cannot self-approve a release",()=>{
 const sha="a".repeat(40),base="b".repeat(40);
 const good=identity({eventName:"pull_request",
  sourceSha:sha,baseSha:base,actualSha:sha});
 assert.equal(good.exactPrSourceVerified,true);
 assert.equal(good.productionReleaseAuthorised,false);
 assert.throws(()=>identity({eventName:"pull_request",
  sourceSha:sha,baseSha:base,actualSha:"c".repeat(40)}),
  /PROTECTED_BRANCH_BASELINE_DENIED/);
 assert.throws(()=>identity({eventName:"pull_request_target",
  sourceSha:sha,baseSha:base,actualSha:sha}),
  /PROTECTED_BRANCH_BASELINE_DENIED/);
});
