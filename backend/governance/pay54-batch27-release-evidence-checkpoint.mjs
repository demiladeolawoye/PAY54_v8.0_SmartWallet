"use strict";
/** PAY54 Batch 27 / 1182 — multi-office verified-source review checkpoint. */
const SHA=/^[a-f0-9]{40}$/;
const OFFICES=Object.freeze(["security","database",
 "devsecops","compliance","qa","release"]);
const deny=()=>{throw Error("PAY54_RELEASE_EVIDENCE_CHECKPOINT_DENIED");};
export function inspectPay54ReleaseEvidenceCheckpoint({
 sourceSha,officeEvidence
}={}){
 if(!SHA.test(sourceSha??"")||!officeEvidence ||
    typeof officeEvidence!=="object" ||
    Array.isArray(officeEvidence) ||
    Object.keys(officeEvidence).length!==OFFICES.length ||
    Object.keys(officeEvidence).some(k=>!OFFICES.includes(k)))deny();
 const missing=[];
 for(const name of OFFICES){
  const v=officeEvidence[name];
  if(!v||typeof v!=="object"||
     v.sourceSha!==sourceSha||
     !/^[a-f0-9]{64}$/.test(v.evidenceDigest??"") ||
     v.signedByIndependentReviewer!==true)missing.push(name);
 }
 return Object.freeze({
  schema:"pay54.release-office-evidence-checkpoint.v1",
  requiredOfficeCount:OFFICES.length,
  claimedIncompleteOffices:Object.freeze(missing),
  structurallyReadyForExternalReview:missing.length===0,
  independentlyAuthenticatedReviewerIdentities:false,
  providerRegulatoryLicenceVerified:false,
  realStagingEnvironmentVerified:false,
  productionReleaseAuthorised:false
 });
}
