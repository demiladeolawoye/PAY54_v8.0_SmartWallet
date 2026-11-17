"use strict";

/**
 * PAY54 Batch 25 / 1005 — deployment security evidence review intake.
 *
 * Do not conflate workflow source, unauthenticated GitHub API errors or
 * self-declared booleans with effective repository protection/cloud IAM.
 * Reviewers must independently authenticate and sign every proof.
 */
const SHA=/^[0-9a-f]{40}$/;
const CHECKS=Object.freeze([
 "defaultBranchProtected",
 "pullRequestReviewEnforced",
 "requiredStatusChecksEnforced",
 "githubEnvironmentReviewersEnforced",
 "oidcSubjectAndAudienceRestricted",
 "cloudDeployerLeastPrivilegeVerified",
 "publicPagesSourceAndArtifactInspected",
 "rollbackRehearsalVerified",
 "secretsNeverExposedToPages"
]);
const deny=()=>{throw new Error("PAY54_DEPLOYER_EVIDENCE_INTAKE_DENIED");};

export function assessPay54DeploymentEvidenceIntake({
 expectedCommitSha,evidence
}={}){
 if(!SHA.test(expectedCommitSha??"") ||
    !evidence || typeof evidence!=="object" ||
    Array.isArray(evidence) ||
    evidence.commitSha!==expectedCommitSha ||
    !Number.isSafeInteger(evidence.capturedAtMs) ||
    evidence.capturedAtMs<1 ||
    !evidence.controls || typeof evidence.controls!=="object" ||
    Array.isArray(evidence.controls) ||
    Object.keys(evidence.controls).length!==CHECKS.length ||
    Object.keys(evidence.controls).some(k=>!CHECKS.includes(k)))deny();
 const missing=CHECKS.filter(key=>evidence.controls[key]!==true);
 const candidate=missing.length===0;
 return Object.freeze({
  schema:"pay54.deployer-control-evidence-review.v1",
  expectedCommitSha,
  expectedControlCount:CHECKS.length,
  claimedCompleteControlCount:CHECKS.length-missing.length,
  missingOrUnverifiedControls:Object.freeze(missing),
  structurallyCompleteForIndependentAttestation:candidate,
  githubStateIndependentlyAuthenticated:false,
  cloudDeployerIdentityAuthenticated:false,
  actualPagesExposureIndependentlyResolved:false,
  evidenceSignatureVerified:false,
  stagingProvisioningAuthorised:false,
  productionDeploymentAuthorised:false
 });
}
