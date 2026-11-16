"use strict";

/*
 * PAY54 Batch 12 item 368 — static Pages dependency validation.
 * Validates *candidate* local HTML/CSS/module references without fetching
 * external networks or modifying a deployment. Dynamic URLs, external script
 * integrity, visual correctness and the deployed artifact require separate QA.
 */
import {readFileSync,lstatSync} from "node:fs";
import {join,posix,resolve} from "node:path";
import {inspectPay54StaticSiteCandidate}
 from "./pay54-static-site-candidate-inventory.mjs";

const MAX_TEXT_BYTES=3_000_000;
const ALLOWED_REMOTE=new Set([
 "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
 "https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js"
]);
function refs(text,extension){
 const found=[];
 if(extension===".html"){
  for(const match of text.matchAll(/\b(?:src|href|poster)=["']([^"'<>]+)["']/gi)){
   found.push(match[1]);
  }
 }else if(extension===".css"){
  for(const match of text.matchAll(/url\(\s*["']?([^)"']+)["']?\s*\)/gi)){
   found.push(match[1].trim());
  }
  for(const match of text.matchAll(/@import\s+["']([^"']+)["']/gi)){
   found.push(match[1]);
  }
 }else if(extension===".js"||extension===".mjs"){
  for(const match of text.matchAll(/\b(?:import|export)\s+(?:[^;"']*?\s+from\s+)?["'](\.{1,2}\/[^"']+)["']/g)){
   found.push(match[1]);
  }
 }
 return found;
}
function resolveReference(from,value,all){
 const raw=value.trim();
 if(!raw||raw.startsWith("#")||/^(?:data|blob|mailto|tel):/i.test(raw)){
  return {ignored:true};
 }
 if(/^(?:https?:)?\/\//i.test(raw)){
  if(ALLOWED_REMOTE.has(raw))return {external:true};
  return {failure:"UNREVIEWED_EXTERNAL_REFERENCE"};
 }
 if(raw.startsWith("/")||raw.includes("\\")||/%(?:2f|5c|00)/i.test(raw)){
  return {failure:"UNSAFE_ABSOLUTE_OR_ENCODED_PATH"};
 }
 let decoded;
 try{decoded=decodeURIComponent(raw.split(/[?#]/,1)[0]);}
 catch{return {failure:"BAD_URL_ENCODING"};}
 if(!decoded||decoded.includes("\0")||decoded.includes("\\")||
    decoded.startsWith("/")){
  return {failure:"PATH_TRAVERSAL_OR_CONTROL"};
 }
 const resolved=posix.normalize(posix.join(posix.dirname(from),decoded));
 if(resolved.startsWith("../")||resolved===".."||resolved.startsWith("/")||
    !/^[A-Za-z0-9._/-]+$/.test(resolved)){
  return {failure:"NONCANONICAL_REFERENCE"};
 }
 if(!all.has(resolved))return {failure:"MISSING_CANDIDATE_DEPENDENCY",resolved};
 return {path:resolved};
}
export function verifyPay54StaticSiteDependencies(sourceRoot){
 const root=resolve(sourceRoot);
 const candidate=inspectPay54StaticSiteCandidate(root);
 const included=new Set(candidate.candidatePaths);
 const issues=[];
 let localReferences=0,reviewedRemoteReferences=0;
 for(const path of candidate.candidatePaths){
  const ext=posix.extname(path).toLowerCase();
  if(![".html",".css",".js",".mjs"].includes(ext))continue;
  const full=join(root,...path.split("/"));
  const st=lstatSync(full);
  if(!st.isFile()||st.isSymbolicLink()||st.size>MAX_TEXT_BYTES){
   issues.push({source:path,reason:"NONREGULAR_SOURCE_FILE"});
   continue;
  }
  const content=readFileSync(full,"utf8");
  for(const value of refs(content,ext)){
   const checked=resolveReference(path,value,included);
   if(checked.ignored)continue;
   if(checked.external){reviewedRemoteReferences++;continue;}
   if(checked.failure){
    issues.push(Object.freeze({source:path,reference:value,
      reason:checked.failure,target:checked.resolved??null}));
   }else localReferences++;
  }
 }
 return Object.freeze({
  includedSourceFiles:candidate.candidateCount,
  localReferences,
  reviewedRemoteReferences,
  issues:Object.freeze(issues),
  dependencyCheckPassed:issues.length===0,
  dynamicReferencesIndependentlyVerified:false,
  remoteScriptsIntegrityVerified:false,
  publicArtifactInspected:false,
  livePublicationAuthorised:false,
  release:"BLOCKED"
 });
}
