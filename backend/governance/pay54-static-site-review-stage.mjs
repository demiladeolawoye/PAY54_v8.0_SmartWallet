"use strict";

/*
 * PAY54 Batch 12 item 372 — stage a review-only frontend snapshot.
 *
 * Never uploads, deploys, creates credentials, modifies the repository or
 * GitHub settings. It refuses missing static dependencies and uses an
 * isolated new directory under an explicit review staging parent.
 */
import {
 constants,openSync,closeSync,readFileSync,writeFileSync,
 lstatSync,mkdirSync,mkdtempSync,rmSync
} from "node:fs";
import {createHash} from "node:crypto";
import {join,resolve,relative,sep} from "node:path";
import {verifyPay54StaticSiteDependencies}
 from "./pay54-static-site-dependency-review.mjs";
import {inspectPay54StaticSiteCandidate}
 from "./pay54-static-site-candidate-inventory.mjs";

function inside(parent,child){
 const rel=relative(parent,child);
 return rel===""||(!rel.startsWith(".."+sep)&&rel!==".."&&!rel.startsWith(sep));
}
export function stagePay54StaticSiteReview({
 sourceRoot,reviewParent
}={}){
 if(typeof sourceRoot!=="string"||typeof reviewParent!=="string"||
    !sourceRoot.trim()||!reviewParent.trim()){
  throw new TypeError("PAY54_STATIC_REVIEW_PATH_REQUIRED");
 }
 const src=resolve(sourceRoot),parent=resolve(reviewParent);
 if(inside(src,parent)||inside(parent,src)){
  throw new Error("PAY54_STATIC_REVIEW_DIRECTORY_OVERLAP");
 }
 const stat=lstatSync(parent);
 if(!stat.isDirectory()||stat.isSymbolicLink()){
  throw new Error("PAY54_STATIC_REVIEW_PARENT_INVALID");
 }
 const dependencies=verifyPay54StaticSiteDependencies(src);
 if(!dependencies.dependencyCheckPassed){
  throw new Error("PAY54_STATIC_REVIEW_DEPENDENCIES_BLOCKED");
 }
 const candidate=inspectPay54StaticSiteCandidate(src);
 const target=mkdtempSync(join(parent,"pay54-static-review-"));
 const hashes=[];
 try{
  for(const path of candidate.candidatePaths){
   const from=join(src,...path.split("/"));
   const fileStat=lstatSync(from);
   if(!fileStat.isFile()||fileStat.isSymbolicLink()||fileStat.size>3_000_000){
    throw new Error("PAY54_STATIC_REVIEW_SOURCE_CHANGED");
   }
   const fd=openSync(from,constants.O_RDONLY|constants.O_NOFOLLOW);
   let bytes;
   try{bytes=readFileSync(fd);}finally{closeSync(fd);}
   if(bytes.length!==fileStat.size){
    throw new Error("PAY54_STATIC_REVIEW_SOURCE_CHANGED");
   }
   const file=join(target,...path.split("/"));
   mkdirSync(join(file,".."),{recursive:true});
   writeFileSync(file,bytes,{flag:"wx",mode:0o644});
   const digest=createHash("sha256").update(bytes).digest("hex");
   hashes.push(Object.freeze({path,sha256:digest,bytes:bytes.length}));
  }
  return Object.freeze({
   reviewDirectory:target,
   fileCount:hashes.length,
   hashes:Object.freeze(hashes),
   excludedSourcePaths:candidate.excludedSourcePaths,
   dependencyCheckPassed:true,
   sourceOnlyReview:true,
   livePagesArtifactReplaced:false,
   githubPagesSettingsChanged:false,
   productionRelease:"BLOCKED"
  });
 }catch(error){
  rmSync(target,{recursive:true,force:true});
  throw error;
 }
}
