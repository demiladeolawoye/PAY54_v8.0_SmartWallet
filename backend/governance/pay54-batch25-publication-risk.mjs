"use strict";

/**
 * PAY54 Batch 25 / 968 — repository-root Pages exposure risk detection.
 *
 * This is a read-only source audit. It does not infer the active GitHub Pages
 * publication settings or publicly reachable artifacts. It explicitly
 * forbids using the source checkout as a deployment artifact.
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { inspectPay54PagesCandidateArtifact } from "./pay54-batch23-pages-artifact.mjs";

const deny=()=>{throw new Error("PAY54_SOURCE_PUBLICATION_AUDIT_DENIED");};
const sensitive=/^(?:backend|infrastructure|docs|\.github|ackend)(?:\/|$)|(?:^|\/)(?:\.env(?:\.|$)|[^/]+\.(?:sql|pem|key|p12|pfx|sqlite|db))$/i;

export function assessPay54RepositoryRootPublication({trackedPaths}={}){
 if(!Array.isArray(trackedPaths) || trackedPaths.length<1 ||
    trackedPaths.length>100000)deny();
 const unique=new Set();
 const sensitiveFiles=[];
 for(const path of trackedPaths){
  if(typeof path!=="string" || path.length>512 ||
     path.length===0 || path.includes("\0") ||
     path.startsWith("/") || path.includes("\\") ||
     path.split("/").some(part=>!part || part==="." || part==="..") ||
     unique.has(path))deny();
  unique.add(path);
  if(sensitive.test(path))sensitiveFiles.push(path);
 }
 sensitiveFiles.sort();
 const rootSafe=sensitiveFiles.length===0;
 return Object.freeze({
  schema:"pay54.source-root-pages-risk.v1",
  trackedFileCount:unique.size,
  sensitiveFileCount:sensitiveFiles.length,
  sensitivePathExamples:Object.freeze(sensitiveFiles.slice(0,24)),
  sourceRootEligibleForPages:rootSafe,
  sourceRootPublicationBlocked:!rootSafe,
  activePagesSourceVerified:false,
  remotePublishedArtifactInspected:false,
  deploymentAuthorised:false
 });
}

export function assessPay54TrackedRepositoryRoot({
 cwd=resolve(import.meta.dirname,"../..")
}={}){
 if(typeof cwd!=="string")deny();
 let data;
 try{
  data=execFileSync("git",["ls-files","-z","--"],{
   cwd,encoding:"utf8",maxBuffer:16*1024*1024,
   timeout:15000,stdio:["ignore","pipe","ignore"]
  });
 }catch{deny();}
 const paths=data.split("\0");
 if(paths.at(-1)==="")paths.pop();
 const result=assessPay54RepositoryRootPublication({trackedPaths:paths});
 const old=inspectPay54PagesCandidateArtifact({
   filePaths:paths.filter(path=>/^[A-Za-z0-9._/@()+-]+$/.test(path))
     .slice(0,10000)
 });
 return Object.freeze({
  ...result,
  previousBoundaryAuditDetected:old.prohibitedFiles.length>0,
  staticReleaseArtifactNotConstructed:true
 });
}
