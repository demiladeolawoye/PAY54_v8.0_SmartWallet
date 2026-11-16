"use strict";

/**
 * PAY54 item 457 — offline rollback readiness evidence assessment.
 *
 * A rollback plan must identify an immutable source and artifact, carry an
 * independently reviewed rehearsal and define a bounded recovery objective.
 * This checks supplied metadata only; it does not stage or execute rollback.
 */
const SHA=/^[0-9a-f]{40}$/;
const HASH=/^[0-9a-f]{64}$/;
const ACTOR=/^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$/;
export function assessPay54RollbackEvidence(evidence,{now}={}){
 if(!evidence||typeof evidence!=="object"||Array.isArray(evidence)){
  throw new TypeError("PAY54_ROLLBACK_EVIDENCE_REQUIRED");
 }
 const referenceMs=typeof now==="string"?Date.parse(now):Number.NaN;
 if(!Number.isFinite(referenceMs)){
  throw new Error("PAY54_ROLLBACK_REVIEW_CLOCK_REQUIRED");
 }
 const issues=[];
 if(!SHA.test(evidence.currentCommitSha??"")||
  !SHA.test(evidence.rollbackCommitSha??"")||
  evidence.currentCommitSha===evidence.rollbackCommitSha){
  issues.push("COMMIT_LINEAGE_INVALID");
 }
 if(!HASH.test(evidence.rollbackArtifactSha256??"")){
  issues.push("ROLLBACK_ARTIFACT_DIGEST_INVALID");
 }
 if(evidence.archiveIsImmutable!==true||evidence.restoreTestSucceeded!==true){
  issues.push("ARCHIVE_OR_RESTORE_UNVERIFIED");
 }
 if(!Number.isInteger(evidence.recoveryObjectiveMinutes)||
  evidence.recoveryObjectiveMinutes<1||evidence.recoveryObjectiveMinutes>120){
  issues.push("RECOVERY_OBJECTIVE_INVALID");
 }
 const testedAt=Date.parse(evidence.rehearsedAt);
 if(typeof evidence.rehearsedAt!=="string"||!Number.isFinite(testedAt)||
  testedAt>referenceMs||referenceMs-testedAt>30*86400000){
  issues.push("REHEARSAL_STALE_OR_INVALID");
 }
 if(!ACTOR.test(evidence.owner??"")||!ACTOR.test(evidence.reviewer??"")||
  evidence.owner===evidence.reviewer){
  issues.push("INDEPENDENT_REVIEW_MISSING");
 }
 if(evidence.customerImpactAssessed!==true||
  evidence.supportEscalationDocumented!==true){
  issues.push("OPERATIONAL_IMPACT_REVIEW_MISSING");
 }
 return Object.freeze({
  schema:"pay54.rollback-evidence-review.v1",
  issues:Object.freeze(issues),
  evidenceMetadataComplete:issues.length===0,
  actualRollbackRehearsalIndependentlyObserved:false,
  archiveCustodyIndependentlyVerified:false,
  releaseAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
