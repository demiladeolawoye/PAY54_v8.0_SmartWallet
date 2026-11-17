"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {reviewPay54PagesEvidenceChain as review}
 from "../governance/pay54-batch27-evidence-chain.mjs";
const repo="demiladeolawoye/PAY54_v8.0_SmartWallet",sha="a".repeat(40);
const settingsInput={repositoryFullName:repo,apiStatus:200,
 authenticatedReviewerId:"operator",observedAtMs:1800000000000,
 response:{status:"built",build_type:"workflow",
  html_url:"https://getpay54.com/",cname:"getpay54.com"}};
const deploymentInput={repositoryFullName:repo,expectedSourceSha:sha,
 reviewedAtMs:1800000000000,response:{id:142,status:"success",
 sha,environment:"github-pages"}};
test("1088: matching API records stay unverified without actual trusted API provenance",()=>{
 const r=review({settingsInput,deploymentInput});
 assert.equal(r.settingsAndDeploymentRecordsStructurallyValid,true);
 assert.equal(r.independentApiAuthenticationRequired,true);
 assert.equal(r.pagesExposureIncidentNotClosed,true);
 assert.equal(r.deploymentAuthorised,false);
});
test("1088: source mismatch and non-GitHub environment deny",()=>{
 assert.throws(()=>review({settingsInput,deploymentInput:{
  ...deploymentInput,repositoryFullName:"attacker/repo"}}),
 /OPERATIONAL_EVIDENCE_CHAIN_DENIED/);
 assert.throws(()=>review({settingsInput,deploymentInput:{
  ...deploymentInput,response:{...deploymentInput.response,
   environment:"production"}}}),/OPERATIONAL_EVIDENCE_CHAIN_DENIED/);
});
