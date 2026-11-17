"use strict";

/**
 * PAY54 Batch 26 / 1018 — independently supplied GitHub Pages deployment
 * metadata structural validator. Raw provider API response is UNTRUSTED:
 * structural checks cannot prove authentic GitHub ownership or live exposure.
 * Never fetch secrets or trigger deploy, IAM or site settings changes.
 */
const SHA=/^[0-9a-f]{40}$/;
const DIGEST=/^[0-9a-f]{64}$/;
const REPO="demiladeolawoye/PAY54_v8.0_SmartWallet";
const ID=/^[1-9][0-9]{0,18}$/;
const URLS=new Set([
 "https://getpay54.com",
 "https://demiladeolawoye.github.io"
]);
const deny=()=>{throw new Error("PAY54_PAGES_DEPLOYMENT_EVIDENCE_DENIED");};
export function inspectPay54PagesDeploymentMetadata({
 repositoryFullName,
 expectedCommitSha,
 pagesConfig,
 deployment
}={}){
 if(repositoryFullName!==REPO || !SHA.test(expectedCommitSha??"") ||
    !pagesConfig || typeof pagesConfig!=="object" ||
    !deployment || typeof deployment!=="object")deny();
 const {buildType,sourceBranch,sourceDirectory,customDomain}=pagesConfig;
 if(!["workflow","legacy"].includes(buildType) ||
    typeof customDomain!=="string" ||
    !["getpay54.com","www.getpay54.com"].includes(customDomain) ||
    !["project-titan","gh-pages"].includes(sourceBranch) ||
    !["/","/docs"].includes(sourceDirectory))deny();
 const {deploymentId,sourceSha,artifactSha256,publicUrl,createdAtMs}=deployment;
 let origin;
 try{origin=new URL(publicUrl).origin;}catch{deny();}
 if(!ID.test(String(deploymentId??"")) ||
    sourceSha!==expectedCommitSha ||
    !DIGEST.test(artifactSha256??"") ||
    !URLS.has(origin) ||
    !Number.isSafeInteger(createdAtMs) || createdAtMs<=0)deny();
 const sourceRootRisk=buildType==="legacy" &&
    sourceBranch==="project-titan" && sourceDirectory==="/";
 return Object.freeze({
  schema:"pay54.pages-deployment-metadata-review.v1",
  inspectedSourceSha:sourceSha,
  expectedArtifactDigest:artifactSha256,
  sourceRootPublicationRisk:sourceRootRisk,
  legacyBranchSourceNeedsContainment:buildType==="legacy",
  metadataStructurallyValid:true,
  metadataIndependentlyAuthenticated:false,
  artifactBytesCompared:false,
  currentPublicArtifactAudited:false,
  pagesExposureResolved:false,
  deploymentAuthorised:false
 });
}
