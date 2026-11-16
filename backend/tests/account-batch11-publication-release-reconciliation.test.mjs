"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import {reconcilePay54PublicationReleaseEvidence}
  from "../governance/pay54-publication-release-reconciliation.mjs";

const SHA="3b336777dc2e1537c8abe9a141c84238a2e073be";
const OTHER="9f819ac1a0eb965b4570514ab2de5b044a010a0f";
const NAMES=[
  "PAY54 Backend Tests",
  "PAY54 Account Boundary Tests",
  "PAY54 Account Security Integration",
  "PAY54 Account Read Access Integration",
  "PAY54 Account Authentication and RLS Integration",
  "PAY54 Batch 10 Synthetic Role and Audit Source Tests"
];
const parameters={
  revisionEvidence:{
    expectedSha:SHA,
    workflowRuns:NAMES.map((name,i)=>({
      name,id:43870403776+i,headSha:SHA,conclusion:"success"
    }))
  },
  publicationEvidence:{
    branch:"project-titan",headSha:SHA,pagesRunId:"43870404027",
    pagesConclusion:"success",
    workflowInventory:[".github/workflows/pay54-backend-tests.yml"]
  },
  proposedSitePaths:["index.html","assets/css/dashboard.css"]
};

test("282: even complete source CI cannot enable publishing or production",()=>{
  const result=reconcilePay54PublicationReleaseEvidence(parameters);
  assert.equal(result.sourceRegressionComplete,true);
  assert.equal(result.proposedSiteManifestSafe,true);
  assert.equal(result.pagesSuccessObserved,true);
  assert.equal(result.authorizedForPublication,false);
  assert.equal(result.authorizedForDeployment,false);
  assert.equal(result.financialExecutionEnabled,false);
  assert.equal(result.productionRelease,"BLOCKED");
  assert.ok(result.unresolved.includes("PAGES_AUTO_PUBLICATION_OBSERVED"));
  assert.ok(Object.isFrozen(result.unresolved));
});
test("282: stale or mismatched source SHAs deny reconciliation",()=>{
  assert.throws(()=>reconcilePay54PublicationReleaseEvidence({
    ...parameters,
    publicationEvidence:{...parameters.publicationEvidence,headSha:OTHER}
  }),/PAY54_RELEASE_REVISION_MISMATCH/);
});
test("282: missing CI or sensitive site file cannot be treated as success",()=>{
  const result=reconcilePay54PublicationReleaseEvidence({
    ...parameters,
    revisionEvidence:{...parameters.revisionEvidence,workflowRuns:[]},
    proposedSitePaths:["backend/src/config.mjs"]
  });
  assert.equal(result.sourceRegressionComplete,false);
  assert.equal(result.proposedSiteManifestSafe,false);
  assert.ok(result.unresolved.includes("SOURCE_REGRESSION_INCOMPLETE"));
  assert.ok(result.unresolved.includes("PUBLIC_MANIFEST_UNSAFE"));
  assert.equal(result.authorizedForDeployment,false);
});
test("282: malformed evidence fails before release decision",()=>{
  for(const input of [
    {}, {...parameters,proposedSitePaths:null},
    {...parameters,revisionEvidence:null}
  ]){
    assert.throws(()=>reconcilePay54PublicationReleaseEvidence(input),
      /PAY54_RELEASE_RECONCILIATION_INVALID/);
  }
});
