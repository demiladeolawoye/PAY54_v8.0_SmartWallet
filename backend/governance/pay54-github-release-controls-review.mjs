"use strict";

/**
 * PAY54 Batch 14 item 421 — read-only GitHub ruleset and deployer evidence
 * assessment. Input must come from authorised, independently reviewed GitHub
 * API/settings exports. Never implies API data was retrieved by this module.
 *
 * Source-only policy checks do not configure GitHub or grant privileges.
 */
const COMMIT=/^[a-f0-9]{40}$/;
const ACTOR=/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;
const REQUIRED_BRANCHES=Object.freeze(["main","project-titan"]);
const REQUIRED_RULES=Object.freeze([
 "requirePullRequestReviews",
 "dismissStaleReviews",
 "requireStatusChecks",
 "blockForcePushes",
 "blockDeletions",
 "restrictBypass"
]);

export const PAY54_REQUIRED_BRANCHES=REQUIRED_BRANCHES;
export const PAY54_REQUIRED_BRANCH_RULES=REQUIRED_RULES;

export function assessPay54GitHubReleaseControls(snapshot){
 if(!snapshot||typeof snapshot!=="object"||Array.isArray(snapshot)){
  throw new TypeError("PAY54_GITHUB_CONTROLS_SNAPSHOT_REQUIRED");
 }
 const findings=[];
 if(!COMMIT.test(snapshot.sourceCommitSha??"")){
  findings.push({subject:"snapshot",reason:"SOURCE_COMMIT_UNVERIFIED"});
 }
 if(snapshot.repository!=="demiladeolawoye/PAY54_v8.0_SmartWallet"){
  findings.push({subject:"repository",reason:"UNEXPECTED_REPOSITORY"});
 }
 if(!snapshot.readOnlyApiEvidence||snapshot.readOnlyApiEvidence!==true){
  findings.push({subject:"snapshot",reason:"LIVE_SETTINGS_EVIDENCE_ABSENT"});
 }
 const branches=Array.isArray(snapshot.branches)?snapshot.branches:[];
 for(const branch of REQUIRED_BRANCHES){
  const matching=branches.filter(x=>x&&x.name===branch);
  if(matching.length!==1){
   findings.push({subject:branch,reason:"MISSING_OR_DUPLICATE_BRANCH_RECORD"});
   continue;
  }
  const item=matching[0];
  for(const name of REQUIRED_RULES){
   if(item[name]!==true){
    findings.push({subject:branch,reason:"REQUIRED_CONTROL_MISSING",control:name});
   }
  }
  if(!Number.isInteger(item.minimumApprovals)||item.minimumApprovals<1){
   findings.push({subject:branch,reason:"INDEPENDENT_APPROVALS_NOT_CONFIGURED"});
  }
 }
 const deployer=snapshot.deployer;
 if(!deployer||typeof deployer!=="object"||Array.isArray(deployer)){
  findings.push({subject:"deployer",reason:"DEPLOYER_EVIDENCE_MISSING"});
 }else{
  if(!ACTOR.test(deployer.identity??"")){
   findings.push({subject:"deployer",reason:"DEPLOYER_IDENTITY_INVALID"});
  }
  if(deployer.usesOidc!==true||deployer.longLivedCredentialsPresent!==false){
   findings.push({subject:"deployer",reason:"LEAST_PRIVILEGE_IDENTITY_UNVERIFIED"});
  }
  if(deployer.environmentProtected!==true||deployer.prCanDeploy===true){
   findings.push({subject:"deployer",reason:"DEPLOYMENT_TRUST_UNVERIFIED"});
  }
 }
 return Object.freeze({
  schema:"pay54.github-release-controls-review.v1",
  requiredBranches:REQUIRED_BRANCHES,
  findings:Object.freeze(findings.map(x=>Object.freeze(x))),
  metadataPolicySatisfied:findings.length===0,
  sourceSettingsAuthenticityVerified:false,
  releaseAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
