"use strict";

/**
 * PAY54 implementation 389 — read-only verification of staged static content.
 *
 * This compares each file's relative path, byte length and SHA-256 digest
 * against a previously reviewed source candidate manifest. Unexpected files,
 * symlinks, missing files and changed bytes fail closed. It never publishes
 * or authorises a release, and does not verify a real GitHub Pages artifact.
 */
import {createHash} from "node:crypto";
import {readdirSync,readFileSync,lstatSync} from "node:fs";
import {resolve,join,relative,isAbsolute,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {hashPay54StaticSiteCandidate}
 from "./pay54-static-site-content-integrity.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const MAX_FILES=500;
const MAX_BYTES=3_000_000;
const sha256=data=>createHash("sha256").update(data).digest("hex");
const safePath=p=>typeof p==="string"&&p.length>0&&
 !p.startsWith("/")&&!p.includes("\\")&&!p.includes("\0")&&
 !p.split("/").some(part=>part===""||part==="."||part==="..");

function collectFiles(root){
 const found=[];
 function walk(folder,relativeDir=""){
  for(const entry of readdirSync(folder,{withFileTypes:true})){
   const name=relativeDir?relativeDir+"/"+entry.name:entry.name;
   const path=join(folder,entry.name);
   const info=lstatSync(path);
   if(info.isSymbolicLink()||(!info.isFile()&&!info.isDirectory())){
    throw new Error("PAY54_STAGE_VERIFY_UNSAFE_ENTRY");
   }
   if(info.isDirectory()){
    walk(path,name);
   }else{
    if(info.size>MAX_BYTES||++found.length>MAX_FILES){
     throw new Error("PAY54_STAGE_VERIFY_LIMIT_EXCEEDED");
    }
    found[found.length-1]=name;
   }
  }
 }
 walk(root);
 return found.sort();
}

export function verifyPay54StagedSite(sourceRoot=ROOT,stagedSiteRoot){
 if(typeof stagedSiteRoot!=="string"||stagedSiteRoot.trim().length===0){
  throw new TypeError("PAY54_STAGE_VERIFY_TARGET_REQUIRED");
 }
 const source=resolve(sourceRoot),staged=resolve(stagedSiteRoot);
 const sourceToStage=relative(source,staged);
 const stageToSource=relative(staged,source);
 if(!sourceToStage||!stageToSource||
  (!sourceToStage.startsWith(".."+sep)&&sourceToStage!=="..")||
  (!stageToSource.startsWith(".."+sep)&&stageToSource!=="..")){
  throw new Error("PAY54_STAGE_VERIFY_OVERLAPPING_ROOTS");
 }
 const rootInfo=lstatSync(staged);
 if(!rootInfo.isDirectory()||rootInfo.isSymbolicLink()){
  throw new Error("PAY54_STAGE_VERIFY_ROOT_DENIED");
 }
 const reference=hashPay54StaticSiteCandidate(source);
 const expected=new Map(reference.files.map(file=>{
  if(!safePath(file.path))throw new Error("PAY54_STAGE_VERIFY_MANIFEST_PATH_DENIED");
  return [file.path,file];
 }));
 const actual=collectFiles(staged);
 const additional=actual.filter(path=>!expected.has(path));
 const missing=reference.files.filter(file=>!actual.includes(file.path))
  .map(file=>file.path);
 const mismatched=[];
 for(const path of actual){
  const spec=expected.get(path);
  if(!spec)continue;
  const bytes=readFileSync(join(staged,...path.split("/")));
  if(bytes.byteLength!==spec.bytes||sha256(bytes)!==spec.sha256){
   mismatched.push(path);
  }
 }
 return Object.freeze({
  schema:"pay54.staged-site-integrity-review.v1",
  manifestSha256:reference.manifestSha256,
  expectedCount:reference.candidateCount,
  actualCount:actual.length,
  additionalFiles:Object.freeze(additional),
  missingFiles:Object.freeze(missing),
  mismatchedFiles:Object.freeze(mismatched),
  verified:additional.length===0&&missing.length===0&&mismatched.length===0,
  realPagesArtifactInspected:false,
  pagesSettingsVerified:false,
  productionRelease:"BLOCKED"
 });
}
