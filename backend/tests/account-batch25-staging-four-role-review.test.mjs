"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {reviewPay54FourRoleStagingEvidence as review}
 from "../governance/pay54-batch25-staging-four-role-review.mjs";
const sha="a".repeat(40);
const pools=Array.from({length:4},()=>({}));
const valid={
 expectedCommitSha:sha,
 sessionReadPool:pools[0],accountReadPool:pools[1],
 sessionRotationPool:pools[2],sessionIssuerPool:pools[3],
 signedAttestationVerifier:{
  verifyForReview:()=>({
   schema:"pay54.staging-signed-evidence-review.v1",
   expectedCommitSha:sha,verifiedCategoryCount:7,
   distinctReviewerCount:3,evidenceSetCompleteForManualReview:true,
   productionDeploymentAuthorised:false
  })
 },
 signedAttestations:[],
 independentlyReviewedMigrationHashes:{},
 verifyMigrationHashes:()=>({
  schema:"pay54.migration-drift-review.v2",
  matchingMigrationCount:20,
  sourceHashesMatchReviewedValues:true,
  reviewedManifestSignatureNotVerifiedHere:true,
  productionReleaseAuthorised:false
 }),
 verifyThreeRoles:async()=>({
  restrictedRolesVerified:true,productionReleaseAuthorised:false
 }),
 verifyIssuerRole:async()=>({
  verifiedRole:"pay54_session_issue_role",
  effectiveFunctionOnlyRoleVerified:true,
  productionReleaseAuthorised:false
 })
};
test("996: all four independent sources can form review packet, never staging approval",async()=>{
 const result=await review(valid);
 assert.equal(result.inspectedEffectivePostgresRoleCount,4);
 assert.equal(result.reviewedSourceMigrationCount,20);
 assert.equal(result.manualDBAAndSecurityReviewStillRequired,true);
 assert.equal(result.authorisedToProvisionStaging,false);
 assert.equal(result.productionDeploymentAuthorised,false);
 assert.ok(Object.isFrozen(result));
});
test("996: mismatched SHA, reused pool, old SQL count, privileged issuer or weak signatures deny",async()=>{
 const cases=[
  {expectedCommitSha:"b".repeat(40)},
  {sessionIssuerPool:pools[0]},
  {verifyMigrationHashes:()=>({
   schema:"pay54.migration-drift-review.v1",
   matchingMigrationCount:18,sourceHashesMatchReviewedValues:true,
   reviewedManifestSignatureNotVerifiedHere:true,
   productionReleaseAuthorised:false
  })},
  {verifyIssuerRole:async()=>({
   verifiedRole:"postgres",
   effectiveFunctionOnlyRoleVerified:true,productionReleaseAuthorised:false
  })},
  {signedAttestationVerifier:{
   verifyForReview:()=>({
    schema:"pay54.staging-signed-evidence-review.v1",
    expectedCommitSha:sha,verifiedCategoryCount:6,
    distinctReviewerCount:3,evidenceSetCompleteForManualReview:true,
    productionDeploymentAuthorised:false
   })
  }},
  {verifyThreeRoles:async()=>{throw Error("private-host");}}
 ];
 for(const change of cases)await assert.rejects(review({...valid,...change}),
  /FOUR_ROLE_STAGING_REVIEW_DENIED/);
});
