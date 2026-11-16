"use strict";

/**
 * PAY54 implementation 371: read-only CSS asset dependency assessment.
 * Static references are checked against the restricted site candidate inventory.
 * External references are inventoried, never implicitly trusted.
 */
import {readFileSync} from "node:fs";
import {posix,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {inspectPay54StaticSiteCandidate} from "./pay54-static-site-candidate-inventory.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const CSS_URL=/\burl\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)]*))\s*\)/gi;
const CSS_IMPORT=/@import\s+(?:"([^"]*)"|'([^']*)')/gi;
const REMOTE=/^https?:\/\//i;
const PROTOCOL_RELATIVE=/^\/\//;
const SCHEME=/^[a-z][a-z\d+.-]*:/i;

function classify(value,page,candidates){
 const raw=value.trim();
 if(raw.startsWith("data:")){
  if(!/^data:image\/(?:png|gif|jpeg|webp|svg\+xml)(?:;[^,]*)?,/i.test(raw)){
   return {kind:"rejected",page,reference:raw,reason:"UNSUPPORTED_DATA_URI"};
  }
  return {kind:"inline",page,reference:"data:image/"};
 }
 if(REMOTE.test(raw))return {kind:"external",page,reference:raw};
 if(PROTOCOL_RELATIVE.test(raw)||SCHEME.test(raw)||raw.startsWith("/")||
  /%2f|%5c|%00/i.test(raw)||raw.includes("\\")||raw.includes("\0")){
  return {kind:"rejected",page,reference:raw,reason:"UNSAFE_REFERENCE"};
 }
 const pathOnly=raw.split(/[?#]/,1)[0];
 let decoded;
 try{decoded=decodeURIComponent(pathOnly);}catch{
  return {kind:"rejected",page,reference:raw,reason:"INVALID_ENCODING"};
 }
 if(!decoded||/%2e/i.test(pathOnly)||decoded.includes("\\")||decoded.includes("\0")){
  return {kind:"rejected",page,reference:raw,reason:"PATH_TRAVERSAL"};
 }
 const path=posix.normalize(posix.join(posix.dirname(page),decoded));
 if(!path.startsWith("assets/")||path.startsWith("../")){
  return {kind:"rejected",page,reference:raw,reason:"OUTSIDE_ASSETS"};
 }
 return candidates.has(path)
  ? {kind:"local",page,reference:raw,resolved:path}
  : {kind:"missing",page,reference:raw,resolved:path};
}

export function auditPay54CssAssetLinks(sourceRoot=ROOT){
 const inventory=inspectPay54StaticSiteCandidate(sourceRoot);
 const candidates=new Set(inventory.candidatePaths);
 const result={checkedLocalReferences:0,missingLocalReferences:[],rejectedReferences:[],
  externalReferences:[],inlineDataReferences:0};
 for(const page of inventory.candidatePaths.filter(x=>x.endsWith(".css"))){
  const css=readFileSync(resolve(sourceRoot,page),"utf8").replace(/\/\*[\s\S]*?\*\//g,"");
  const references=[
   ...[...css.matchAll(CSS_URL)].map(m=>m[1]??m[2]??m[3]),
   ...[...css.matchAll(CSS_IMPORT)].map(m=>m[1]??m[2])
  ];
  for(const ref of references){
   const item=classify(ref,page,candidates);
   switch(item.kind){
    case "local": result.checkedLocalReferences++;break;
    case "missing": result.missingLocalReferences.push(item);break;
    case "rejected": result.rejectedReferences.push(item);break;
    case "external": result.externalReferences.push(item);break;
    case "inline": result.inlineDataReferences++;break;
   }
  }
 }
 return Object.freeze({
  checkedLocalReferences:result.checkedLocalReferences,
  missingLocalReferences:Object.freeze(result.missingLocalReferences),
  rejectedReferences:Object.freeze(result.rejectedReferences),
  externalReferences:Object.freeze(result.externalReferences),
  inlineDataReferences:result.inlineDataReferences,
  complete:result.missingLocalReferences.length===0&&result.rejectedReferences.length===0,
  sourceAuditOnly:true,actualDeploymentInspected:false,
  publicationAuthorized:false,productionRelease:"BLOCKED"
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const report=auditPay54CssAssetLinks();
  process.stdout.write(JSON.stringify(report,null,2)+"\n");
  if(!report.complete)process.exitCode=1;
 }catch{
  process.stderr.write("PAY54_CSS_ASSET_AUDIT_FAILED\n");
  process.exitCode=1;
 }
}
