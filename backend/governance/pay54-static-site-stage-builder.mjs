"use strict";

/**
 * PAY54 item 385 — local, source-only static-site staging builder.
 * The caller provides an existing EMPTY destination directory outside the repo.
 * Never calls GitHub APIs, deploys, changes Pages settings or authorises release.
 */
import {createHash,randomUUID} from "node:crypto";
import {
 readdirSync,lstatSync,mkdirSync,readFileSync,writeFileSync,
 renameSync,rmSync
} from "node:fs";
import {resolve,join,dirname,relative,isAbsolute} from "node:path";
import {fileURLToPath} from "node:url";
import {inspectPay54PublicationReadiness}
 from "./pay54-publication-source-readiness.mjs";
import {hashPay54StaticSiteCandidate}
 from "./pay54-static-site-content-integrity.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const sha=bytes=>createHash("sha256").update(bytes).digest("hex");
function nestedIn(parent,child){
 const r=relative(parent,child);
 return !r||(!r.startsWith("..")&&!isAbsolute(r));
}

export function stagePay54SiteCandidate(sourceRoot=ROOT,destinationRoot){
 if(typeof destinationRoot!=="string"||!destinationRoot.trim()){
  throw new TypeError("PAY54_STAGE_TARGET_REQUIRED");
 }
 const source=resolve(sourceRoot),target=resolve(destinationRoot);
 if(nestedIn(source,target)||nestedIn(target,source)){
  throw new Error("PAY54_STAGE_SOURCE_TARGET_OVERLAP");
 }
 const info=lstatSync(target);
 if(!info.isDirectory()||info.isSymbolicLink()||readdirSync(target).length!==0){
  throw new Error("PAY54_STAGE_TARGET_MUST_BE_EMPTY_DIRECTORY");
 }
 const report=inspectPay54PublicationReadiness(source);
 if(report.sourceDependencyStatus!=="PASS"){
  throw new Error("PAY54_STAGE_LINK_REVIEW_FAILED");
 }
 const manifest=hashPay54StaticSiteCandidate(source);
 const staging=join(target,".pay54-stage-"+randomUUID());
 mkdirSync(staging);
 try{
  for(const file of manifest.files){
   const input=resolve(source,file.path);
   const sourceInfo=lstatSync(input);
   if(!sourceInfo.isFile()||sourceInfo.isSymbolicLink()){
    throw new Error("PAY54_STAGE_SOURCE_CHANGED");
   }
   const bytes=readFileSync(input);
   if(bytes.length!==file.bytes||sha(bytes)!==file.sha256){
    throw new Error("PAY54_STAGE_CONTENT_CHANGED");
   }
   const output=join(staging,file.path);
   mkdirSync(dirname(output),{recursive:true});
   writeFileSync(output,bytes,{flag:"wx",mode:0o644});
   if(sha(readFileSync(output))!==file.sha256){
    throw new Error("PAY54_STAGE_COPY_VERIFY_FAILED");
   }
  }
  renameSync(staging,join(target,"site"));
  return Object.freeze({
   schema:"pay54.local-static-stage.v1",
   candidateCount:manifest.candidateCount,
   manifestSha256:manifest.manifestSha256,
   outputDirectory:join(target,"site"),
   sourceOnly:true,
   productionRelease:"BLOCKED",
   actualPagesSettingsModified:false
  });
 }catch(error){
  rmSync(staging,{force:true,recursive:true});
  throw error;
 }
}
