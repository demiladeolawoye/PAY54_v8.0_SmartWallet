"use strict";
/** PAY54 Batch 27 / 1154 — inspect Pages Actions artifact inventory metadata. */
const deny=()=>{throw Error("PAY54_PAGES_ARTIFACTS_REVIEW_DENIED");};
const SHA=/^[a-f0-9]{40}$/;
export function inspectPay54GithubPagesArtifactInventory({
 expectedSourceSha,artifacts
}={}){
 if(!SHA.test(expectedSourceSha??"")||
    !Array.isArray(artifacts)||artifacts.length>1000)deny();
 const seen=new Set(),candidates=[];
 for(const item of artifacts){
  if(!item||!Number.isSafeInteger(item.id)||item.id<1||seen.has(item.id)||
     typeof item.name!=="string"||item.name.length>128||
     typeof item.expired!=="boolean" ||
     typeof item.size_in_bytes!=="number" ||
     !Number.isSafeInteger(item.size_in_bytes) ||
     item.size_in_bytes<0||item.size_in_bytes>1024*1024*1024)deny();
  seen.add(item.id);
  if(item.name==="github-pages"&&!item.expired)candidates.push(item.id);
 }
 return Object.freeze({
  schema:"pay54.github-pages-artifacts-metadata.v1",
  expectedSourceSha,metadataArtifactCount:artifacts.length,
  nonExpiredPagesArtifactIds:Object.freeze(candidates),
  actualArtifactHeadShaVerified:false,
  candidateFilesIndependentlyDownloadedAndScanned:false,
  activePagesDeploymentMatched:false,
  deploymentAuthorised:false
 });
}
