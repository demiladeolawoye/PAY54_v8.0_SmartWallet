"use strict";
/** Batch26/1020 — compare independently supplied artifact manifest to checked bytes. */
import {createHash,timingSafeEqual} from "node:crypto";
const DIGEST=/^[0-9a-f]{64}$/;
const SHA=/^[0-9a-f]{40}$/;
const deny=()=>{throw new Error("PAY54_PAGES_ARTIFACT_PROVENANCE_DENIED");};
export function verifyPay54PagesArtifactProvenance({
 expectedCommitSha,manifest,observedFiles
}={}){
 if(!SHA.test(expectedCommitSha??"") ||
    !manifest || manifest.sourceCommitSha!==expectedCommitSha ||
    !Array.isArray(manifest.files) || !manifest.files.length ||
    manifest.files.length>10000 ||
    !observedFiles || typeof observedFiles!=="object" ||
    Array.isArray(observedFiles) ||
    Object.keys(observedFiles).length!==manifest.files.length)deny();
 const paths=new Set();
 for(const item of manifest.files){
  if(typeof item?.path!=="string" ||
     item.path.startsWith("/") || item.path.includes("\\") ||
     item.path.split("/").some(x=>!x||x==="."||x==="..") ||
     !/^[A-Za-z0-9_./@()+-]+$/.test(item.path) ||
     paths.has(item.path) || !DIGEST.test(item.sha256??"") ||
     !Object.hasOwn(observedFiles,item.path))deny();
  paths.add(item.path);
  const bytes=observedFiles[item.path];
  if(!Buffer.isBuffer(bytes) || !bytes.length ||
     !timingSafeEqual(
       createHash("sha256").update(bytes).digest(),
       Buffer.from(item.sha256,"hex")))deny();
 }
 if(!paths.has("index.html"))deny();
 return Object.freeze({
  schema:"pay54.pages-artifact-manifest-match.v1",
  sourceCommitSha:expectedCommitSha,
  matchedFileCount:paths.size,
  observedBytesMatchedSuppliedManifest:true,
  independentSourceAttestationVerified:false,
  livePagesBytesVerified:false,
  deploymentAuthorised:false
 });
}
