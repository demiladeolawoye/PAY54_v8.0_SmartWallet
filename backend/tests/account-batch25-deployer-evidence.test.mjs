"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54DeploymentEvidenceIntake as assess}
 from "../governance/pay54-batch25-deployer-evidence.mjs";

const sha="a".repeat(40);
const controls=Object.fromEntries([
 "defaultBranchProtected","pullRequestReviewEnforced",
 "requiredStatusChecksEnforced",
 "githubEnvironmentReviewersEnforced",
 "oidcSubjectAndAudienceRestricted",
 "cloudDeployerLeastPrivilegeVerified",
 "publicPagesSourceAndArtifactInspected",
 "rollbackRehearsalVerified",
 "secretsNeverExposedToPages"
].map(x=>[x,true]));
const valid={
 expectedCommitSha:sha,evidence:{
  commitSha:sha,capturedAtMs:1800000000000,controls
 }
};
test("1006: all nine claimed controls remain unverified without independent authentication",()=>{
 const r=assess(valid);
 assert.equal(r.structurallyCompleteForIndependentAttestation,true);
 assert.equal(r.githubStateIndependentlyAuthenticated,false);
 assert.equal(r.evidenceSignatureVerified,false);
 assert.equal(r.productionDeploymentAuthorised,false);
 assert.ok(Object.isFrozen(r.missingOrUnverifiedControls));
});
test("1006: missing Pages, OIDC and protected release control remain open",()=>{
 const updated={...controls,
  oidcSubjectAndAudienceRestricted:false,
  publicPagesSourceAndArtifactInspected:false
 };
 const r=assess({...valid,evidence:{...valid.evidence,controls:updated}});
 assert.equal(r.structurallyCompleteForIndependentAttestation,false);
 assert.ok(r.missingOrUnverifiedControls.includes(
  "oidcSubjectAndAudienceRestricted"));
});
test("1006: stale commit, invented checks and missing evidence deny",()=>{
 for(const evidence of [
  {...valid.evidence,commitSha:"b".repeat(40)},
  {...valid.evidence,controls:{...controls,autoRelease:true}},
  {...valid.evidence,controls:[]},
  {...valid.evidence,capturedAtMs:NaN}
 ])assert.throws(()=>assess({...valid,evidence}),
  /DEPLOYER_EVIDENCE_INTAKE_DENIED/);
});
