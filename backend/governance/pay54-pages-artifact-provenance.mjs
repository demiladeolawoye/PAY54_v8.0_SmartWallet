"use strict";

/**
 * PAY54 item 488 — validate provenance metadata for independently retrieved
 * GitHub Actions Pages artifacts. Requires trusted expected source parameters.
 * Does not call GitHub or trust values merely because the user supplied them.
 */
const SHA40=/^[a-f0-9]{40}$/;
const SHA256=/^(?:sha256:)?[a-f0-9]{64}$/;
const EXPECTED_REPO="demiladeolawoye/PAY54_v8.0_SmartWallet";
const MAX_AGE_MS=30*86400000;

export function reviewPay54PagesArtifactProvenance({
 artifact,expectedCommitSha,expectedRunId,now
}={}){
 if(!artifact||typeof artifact!=="object"||Array.isArray(artifact)){
  throw new TypeError("PAY54_ARTIFACT_PROVENANCE_REQUIRED");
 }
 const nowMs=typeof now==="string"?Date.parse(now):NaN;
 if(!Number.isFinite(nowMs)||!SHA40.test(expectedCommitSha??"")||
  !Number.isSafeInteger(expectedRunId)||expectedRunId<1){
  throw new Error("PAY54_ARTIFACT_PROVENANCE_EXPECTATIONS_INVALID");
 }
 const findings=[];
 if(artifact.repository!==EXPECTED_REPO)findings.push("REPOSITORY_MISMATCH");
 if(artifact.name!=="github-pages")findings.push("ARTIFACT_TYPE_MISMATCH");
 if(artifact.workflowRunId!==expectedRunId)findings.push("RUN_ID_MISMATCH");
 if(artifact.sourceCommitSha!==expectedCommitSha)findings.push("SOURCE_COMMIT_MISMATCH");
 if(!Number.isSafeInteger(artifact.artifactId)||artifact.artifactId<1){
  findings.push("ARTIFACT_ID_MISSING");
 }
 if(!Number.isSafeInteger(artifact.bytes)||artifact.bytes<1||
  artifact.bytes>100_000_000){
  findings.push("ARTIFACT_SIZE_INVALID");
 }
 if(!SHA256.test(artifact.digest??""))findings.push("ARTIFACT_DIGEST_INVALID");
 if(artifact.expired!==false) findings.push("ARTIFACT_EXPIRED_OR_UNVERIFIED");
 const created=Date.parse(artifact.createdAt);
 if(typeof artifact.createdAt!=="string"||!Number.isFinite(created)||
  created>nowMs||nowMs-created>MAX_AGE_MS){
  findings.push("ARTIFACT_AGE_UNVERIFIED");
 }
 return Object.freeze({
  schema:"pay54.github-pages-artifact-provenance.v1",
  expectedSourceCommitSha:expectedCommitSha,
  expectedRunId,
  findings:Object.freeze(findings),
  metadataConsistent:findings.length===0,
  artifactBytesIndependentlyVerified:false,
  trustedGithubOriginAttested:false,
  liveSiteReachabilityConfirmed:false,
  releaseAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
