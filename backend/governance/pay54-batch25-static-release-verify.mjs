"use strict";

/**
 * PAY54 Batch 25 / 970 — static release directory verifier.
 *
 * Must run on the finished output directory, never the source repository.
 * Rejects links, special files, hidden files, ambiguous names and content
 * types that might expose backend modules or sourcemaps. It does not upload,
 * publish, deploy or claim remote Pages containment.
 */
import { lstatSync,readdirSync,readFileSync } from "node:fs";
import { resolve,relative } from "node:path";
import { createHash } from "node:crypto";
import { inspectPay54PagesCandidateArtifact }
 from "./pay54-batch23-pages-artifact.mjs";

const SAFE=/^[A-Za-z0-9_+().@-]+$/;
const ALLOWED=/\.(?:html|css|js|mjs|png|jpg|jpeg|webp|svg|gif|ico|woff2|webmanifest|txt)$/i;
const deny=()=>{throw new Error("PAY54_STATIC_RELEASE_BUNDLE_DENIED");};

export function verifyPay54StaticReleaseDirectory({
 directory,maxFiles=3000,maxTotalBytes=80*1024*1024
}={}){
 if(typeof directory!=="string" || !directory.trim() ||
    !Number.isInteger(maxFiles) || maxFiles<1 || maxFiles>10000 ||
    !Number.isSafeInteger(maxTotalBytes) ||
    maxTotalBytes<1024 || maxTotalBytes>500*1024*1024)deny();

 const root=resolve(directory);
 let rootStat;
 try{rootStat=lstatSync(root);}catch{deny();}
 if(!rootStat.isDirectory() || rootStat.isSymbolicLink())deny();

 const seen=new Set(),entries=[];
 let totalBytes=0;
 const walk=(current,depth)=>{
  if(depth>12)deny();
  let names;
  try{names=readdirSync(current);}catch{deny();}
  for(const name of names){
   if(!SAFE.test(name) || name.startsWith(".") || name===".." ||
      name.length>128)deny();
   const absolute=resolve(current,name);
   const rel=relative(root,absolute).replaceAll("\\","/");
   if(rel.startsWith("../") || rel.startsWith("/") ||
      seen.has(rel) || rel.length>512)deny();
   seen.add(rel);
   let stat;
   try{stat=lstatSync(absolute);}catch{deny();}
   if(stat.isSymbolicLink())deny();
   if(stat.isDirectory()){
    walk(absolute,depth+1);
    continue;
   }
   if(!stat.isFile() || stat.nlink>1 ||
      !ALLOWED.test(name) || stat.size<1 || stat.size>12*1024*1024)deny();
   totalBytes+=stat.size;
   if(totalBytes>maxTotalBytes || entries.length>=maxFiles)deny();
   const bytes=readFileSync(absolute);
   if(bytes.length!==stat.size)deny();
   entries.push(Object.freeze({
    path:rel,bytes:bytes.length,
    sha256:createHash("sha256").update(bytes).digest("hex")
   }));
  }
 };
 walk(root,0);
 const manifest=entries.map(item=>item.path);
 if(!manifest.includes("index.html"))deny();
 const policy=inspectPay54PagesCandidateArtifact({filePaths:manifest});
 if(!policy.candidateSourceBoundaryPassed)deny();
 entries.sort((a,b)=>a.path.localeCompare(b.path,"en"));
 return Object.freeze({
  schema:"pay54.offline-static-release-verification.v1",
  fileCount:entries.length,
  totalBytes,
  entries:Object.freeze(entries),
  candidateDirectoryApprovedForIndependentReview:true,
  remoteArtifactInspected:false,
  activePagesPublicationVerified:false,
  deploymentAuthorised:false
 });
}
