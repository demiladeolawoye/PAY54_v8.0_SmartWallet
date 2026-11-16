"use strict";

/*
 * PAY54 Batch 12 item 364 — dry-run, read-only static publication inventory.
 * Never modifies GitHub Pages settings, deploys, copies files or changes
 * repository contents. A candidate manifest is NOT actual public-site evidence.
 */
import {readdirSync,lstatSync} from "node:fs";
import {resolve,join} from "node:path";
import {fileURLToPath} from "node:url";
import {assessPay54PublicSiteManifest}
 from "./pay54-public-site-manifest.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const ROOT_PAGES=new Set([
 "index.html","dashboard.html","login.html","signup.html",
 "checkout.html","request.html","forgot-pin.html",
 "create-new-pin.html","verify-otp.html"
]);
const ALLOWED_ASSETS=new Set(["js","css","img","images","fonts"]);
const ALLOWED_EXT=/\.(?:js|mjs|css|png|jpg|jpeg|svg|webp|gif|ico|woff2|woff)$/i;
const MAX_FILES=500,MAX_FILE_BYTES=3_000_000;
function walk(base,subpath,paths,excluded){
 for(const entry of readdirSync(join(base,subpath),{withFileTypes:true})){
  const path=[subpath,entry.name].filter(Boolean).join("/");
  const info=lstatSync(join(base,path));
  if(info.isSymbolicLink())throw new Error("PAY54_SITE_CANDIDATE_SYMLINK_DENIED");
  if(info.isDirectory()){
   walk(base,path,paths,excluded);
  }else if(info.isFile()){
   if(info.size>MAX_FILE_BYTES)throw new Error("PAY54_SITE_CANDIDATE_FILE_OVERSIZED");
   if(path.split("/").some(part=>part.startsWith("."))||
      !ALLOWED_EXT.test(path)||
      !assessPay54PublicSiteManifest({paths:[path]})
        .sourceManifestStructurallySafe){
    excluded.push(path);
    continue;
   }
   paths.push(path);
   if(paths.length>MAX_FILES)throw new Error("PAY54_SITE_CANDIDATE_TOO_MANY_FILES");
  }else throw new Error("PAY54_SITE_CANDIDATE_FILE_TYPE_DENIED");
 }
}
export function inspectPay54StaticSiteCandidate(sourceRoot=ROOT){
 if(typeof sourceRoot!=="string"||sourceRoot.trim().length===0){
  throw new TypeError("PAY54_SITE_CANDIDATE_ROOT_INVALID");
 }
 const root=resolve(sourceRoot);
 const paths=[];
 const excluded=[];
 const assetsRoot=join(root,"assets");
 try{
  const assetsInfo=lstatSync(assetsRoot);
  if(!assetsInfo.isDirectory()||assetsInfo.isSymbolicLink()){
   throw new Error("PAY54_SITE_CANDIDATE_ASSETS_ROOT_INVALID");
  }
 }catch(error){
  if(error.code!=="ENOENT")throw error;
 }
 for(const page of ROOT_PAGES){
  const path=join(root,page);
  let info;
  try{info=lstatSync(path);}catch{continue;}
  if(!info.isFile()||info.isSymbolicLink()||info.size>MAX_FILE_BYTES){
   throw new Error("PAY54_SITE_CANDIDATE_PAGE_INVALID");
  }
  paths.push(page);
 }
 for(const category of ALLOWED_ASSETS){
  const dir=join(root,"assets",category);
  let info;
  try{info=lstatSync(dir);}catch{continue;}
  if(!info.isDirectory()||info.isSymbolicLink()){
   throw new Error("PAY54_SITE_CANDIDATE_ASSET_DIRECTORY_INVALID");
  }
  walk(root,"assets/"+category,paths,excluded);
 }
 paths.sort();
 if(paths.length<1||paths.length>MAX_FILES){
  throw new Error("PAY54_SITE_CANDIDATE_EMPTY_OR_OVERSIZED");
 }
 const unique=new Set(paths);
 if(unique.size!==paths.length){
  throw new Error("PAY54_SITE_CANDIDATE_DUPLICATE");
 }
 const assessed=assessPay54PublicSiteManifest({paths});
 const disallowed=paths.filter(path=>
   !ROOT_PAGES.has(path)&&
   (!path.startsWith("assets/")||
    !ALLOWED_ASSETS.has(path.split("/")[1])));
 if(disallowed.length||!assessed.sourceManifestStructurallySafe){
  throw new Error("PAY54_SITE_CANDIDATE_MANIFEST_DENIED");
 }
 return Object.freeze({
  candidatePaths:Object.freeze(paths),
  excludedSourcePaths:Object.freeze(excluded.sort()),
  candidateCount:paths.length,
  rootPages:paths.filter(x=>ROOT_PAGES.has(x)).length,
  excludesBackendAndInfrastructure:true,
  sourceInventoryOnly:true,
  fullAssetDependencyGraphVerified:false,
  actualPagesArtifactInspected:false,
  actualLiveUrlsVerified:false,
  repoPagesSettingsVerified:false,
  publicationAuthorized:false,
  deployerPermissionsChanged:false,
  productionRelease:"BLOCKED"
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const result=inspectPay54StaticSiteCandidate();
  process.stdout.write(JSON.stringify(result,null,2)+"\n");
 }catch{
  process.stderr.write("PAY54_SITE_CANDIDATE_INSPECTION_FAILED\n");
  process.exitCode=1;
 }
}
