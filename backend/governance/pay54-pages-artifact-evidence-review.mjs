"use strict";

/**
 * PAY54 item 447 — compare an independently supplied Pages artifact inventory
 * against the restricted local source candidate, without reading real
 * deployments, altering settings or asserting evidence authenticity.
 */
import {hashPay54StaticSiteCandidate}
 from "./pay54-static-site-content-integrity.mjs";

const HEX=/^[a-f0-9]{64}$/;
export function assessPay54PagesArtifactInventory({
 sourceRoot,artifactEntries,artifactCommitSha,expectedCommitSha
}={}){
 if(!Array.isArray(artifactEntries)||artifactEntries.length>500||
  !/^[a-f0-9]{40}$/.test(expectedCommitSha??"")||
  artifactCommitSha!==expectedCommitSha){
  throw new Error("PAY54_PAGES_ARTIFACT_PROVENANCE_INVALID");
 }
 const source=hashPay54StaticSiteCandidate(sourceRoot);
 const expected=new Map(source.files.map(f=>[f.path,f]));
 const received=new Map();
 const issues=[];
 for(const entry of artifactEntries){
  if(!entry||typeof entry.path!=="string"||
   entry.path.startsWith("/")||entry.path.includes("\\")||
   entry.path.split("/").some(x=>!x||x==="."||x==="..")||
   !Number.isSafeInteger(entry.bytes)||entry.bytes<0||
   !HEX.test(entry.sha256??"")){
   issues.push(Object.freeze({category:"INVALID_ENTRY"}));
   continue;
  }
  if(received.has(entry.path)){
   issues.push(Object.freeze({category:"DUPLICATE_ARTIFACT_PATH",path:entry.path}));
   continue;
  }
  received.set(entry.path,entry);
 }
 for(const [path,entry] of received){
  const match=expected.get(path);
  if(!match){
   issues.push(Object.freeze({category:"UNEXPECTED_ARTIFACT_PATH",path}));
   continue;
  }
  if(match.bytes!==entry.bytes||match.sha256!==entry.sha256){
   issues.push(Object.freeze({category:"ARTIFACT_CONTENT_MISMATCH",path}));
  }
 }
 for(const path of expected.keys()){
  if(!received.has(path)){
   issues.push(Object.freeze({category:"MISSING_ARTIFACT_PATH",path}));
  }
 }
 return Object.freeze({
  schema:"pay54.pages-artifact-evidence-comparison.v1",
  reviewedCommit:expectedCommitSha,
  sourceManifestSha256:source.manifestSha256,
  expectedCount:expected.size,
  artifactEntryCount:received.size,
  issues:Object.freeze(issues),
  manifestsMatch:issues.length===0,
  artifactOriginIndependentlyVerified:false,
  actualPagesDeploymentInspected:false,
  releaseAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
