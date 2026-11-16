"use strict";

/**
 * PAY54 item 500 — predeployment upload-plan policy for a restricted Pages
 * site. It validates an owner-supplied, offline plan; never creates an actual
 * Pages upload, changes GitHub settings or authorises release.
 */
const SHA=/^[a-f0-9]{40}$/;
const DIGEST=/^[a-f0-9]{64}$/;
export function reviewPay54PagesUploadPlan({
 stageAttestation,upload,expectedCommitSha
}={}){
 if(!stageAttestation||!upload||!SHA.test(expectedCommitSha??"")){
  throw new TypeError("PAY54_PAGES_UPLOAD_PLAN_REQUIRED");
 }
 const findings=[];
 if(stageAttestation.schema!=="pay54.local-publication-attestation.v1"||
  stageAttestation.sourceToStageMatches!==true||
  !DIGEST.test(stageAttestation.sourceManifestSha256??"")){
  findings.push("STAGED_SOURCE_UNVERIFIED");
 }
 if(upload.repository!=="demiladeolawoye/PAY54_v8.0_SmartWallet"||
  upload.commitSha!==expectedCommitSha){
  findings.push("UPLOAD_SOURCE_COMMIT_MISMATCH");
 }
 if(upload.localDirectory!=="site"&&upload.localDirectory!=="./site"){
  findings.push("UNRESTRICTED_UPLOAD_DIRECTORY");
 }
 if(upload.contentManifestSha256!==stageAttestation.sourceManifestSha256){
  findings.push("UPLOADED_SOURCE_DIGEST_MISMATCH");
 }
 if(upload.artifactScope!=="STATIC_SITE_ONLY"||
  upload.allowBackendContent!==false||
  upload.excludesSourceMaps!==true){
  findings.push("UPLOAD_SCOPE_UNSAFE");
 }
 if(upload.deploymentEnvironment!=="github-pages"||
  upload.environmentProtected!==true){
  findings.push("DEPLOYMENT_ENVIRONMENT_UNVERIFIED");
 }
 if(upload.sourceOnlyDryRun!==true){
  findings.push("DRY_RUN_MODE_REQUIRED");
 }
 return Object.freeze({
  schema:"pay54.pages-restricted-upload-plan.v1",
  commitSha:expectedCommitSha,
  findings:Object.freeze(findings),
  uploadPlanStructurallySafe:findings.length===0,
  actualWorkflowSettingsVerified:false,
  deployedPagesArtifactVerified:false,
  uploadPerformed:false,
  releaseAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
