"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
 PAY54_REQUIRED_BRANCHES,PAY54_REQUIRED_BRANCH_RULES,
 assessPay54GitHubReleaseControls
} from "../governance/pay54-github-release-controls-review.mjs";

function valid(){
 return {
  repository:"demiladeolawoye/PAY54_v8.0_SmartWallet",
  sourceCommitSha:"a".repeat(40),
  readOnlyApiEvidence:true,
  branches:PAY54_REQUIRED_BRANCHES.map(name=>({
   name,minimumApprovals:2,
   ...Object.fromEntries(PAY54_REQUIRED_BRANCH_RULES.map(rule=>[rule,true]))
  })),
  deployer:{
   identity:"pay54-release-oidc",
   usesOidc:true,
   longLivedCredentialsPresent:false,
   environmentProtected:true,
   prCanDeploy:false
  }
 };
}
test("422: complete configuration metadata never activates production",()=>{
 const r=assessPay54GitHubReleaseControls(valid());
 assert.equal(r.metadataPolicySatisfied,true);
 assert.equal(r.sourceSettingsAuthenticityVerified,false);
 assert.equal(r.releaseAuthorised,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("422: missing branch rules are rejected for each branch",()=>{
 for(const control of PAY54_REQUIRED_BRANCH_RULES){
  const snapshot=valid();snapshot.branches[0][control]=false;
  const r=assessPay54GitHubReleaseControls(snapshot);
  assert.ok(r.findings.some(x=>x.control===control&&x.subject==="main"));
  assert.equal(r.metadataPolicySatisfied,false);
 }
});
test("422: branch record duplication and missing approvals fail closed",()=>{
 const duplicate=valid();duplicate.branches.push({...duplicate.branches[0]});
 assert.ok(assessPay54GitHubReleaseControls(duplicate).findings.some(x=>
  x.reason==="MISSING_OR_DUPLICATE_BRANCH_RECORD"));
 const missing=valid();missing.branches=[];
 assert.equal(assessPay54GitHubReleaseControls(missing).metadataPolicySatisfied,false);
});
test("422: trusted deployer identity and protected environment are compulsory",()=>{
 const changes=[
  ["usesOidc",false],
  ["longLivedCredentialsPresent",true],
  ["environmentProtected",false],
  ["prCanDeploy",true]
 ];
 for(const [key,value] of changes){
  const snapshot=valid();snapshot.deployer[key]=value;
  assert.equal(assessPay54GitHubReleaseControls(snapshot).metadataPolicySatisfied,false);
 }
});
test("422: GitHub settings evidence and repository identity cannot be assumed",()=>{
 const snapshot=valid();snapshot.readOnlyApiEvidence=false;
 assert.ok(assessPay54GitHubReleaseControls(snapshot).findings.some(x=>
  x.reason==="LIVE_SETTINGS_EVIDENCE_ABSENT"));
 snapshot.readOnlyApiEvidence=true;
 snapshot.repository="attacker/repository";
 assert.equal(assessPay54GitHubReleaseControls(snapshot).metadataPolicySatisfied,false);
 assert.throws(()=>assessPay54GitHubReleaseControls(null),/SNAPSHOT_REQUIRED/);
});
