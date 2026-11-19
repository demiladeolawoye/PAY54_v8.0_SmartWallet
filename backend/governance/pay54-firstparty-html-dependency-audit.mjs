"use strict";

/**
 * PAY54 Batch 18 item 618 — first-party HTML dependency release audit.
 *
 * Only reports bounded paths and source-to-candidate dependency differences.
 * This audit does not execute client code, deploy, mutate the tree or claim
 * public reachability. It applies the canonical candidate policy.
 */
import {readFileSync} from "node:fs";
import {resolve,join,posix} from "node:path";
import {fileURLToPath} from "node:url";
import {inspectPay54StaticSiteCandidate}
 from "./pay54-static-site-candidate-inventory.mjs";
import {assessPay54PublicSiteManifest}
 from "./pay54-public-site-manifest.mjs";
import {projectPay54HtmlResourceMarkup}
 from "./pay54-html-resource-markup.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const ATTRIBUTE=/<(?:script|link|img)\b[^>]*\b(?:src|href)\s*=\s*(["'])([^"'<>\r\n]{1,500})\1[^>]*>/gi;
const PAGE=/^[^/]+\.html$/i;
const LOCAL=/^[a-zA-Z0-9_.\/-]+(?:[?#][^\s]*)?$/;
const MAX_REFS=5000;
function classify(page,raw,candidates){
 const pathOnly=raw.split(/[?#]/,1)[0];
 if(!LOCAL.test(raw)||!pathOnly||pathOnly.startsWith("/")||
  raw.includes("\\")||/%(?:2e|2f|5c|00)/i.test(raw)){
  return {status:"REJECTED_URL",target:null};
 }
 let target;
 try{
  const decoded=decodeURIComponent(pathOnly);
  if(decoded.split("/").some(x=>x===".."||x===".")){
   return {status:"REJECTED_TRAVERSAL",target:null};
  }
  target=posix.normalize(posix.join(posix.dirname(page),decoded));
 }catch{return {status:"INVALID_ENCODING",target:null};}
 if(!target||target==="."||target.startsWith("../")||target.startsWith("/")){
  return {status:"REJECTED_PATH",target:null};
 }
 if(candidates.has(target))return {status:"CANDIDATE_INCLUDED",target};
 const policy=assessPay54PublicSiteManifest({paths:[target]});
 return {status:policy.sourceManifestStructurallySafe?
  "CANDIDATE_MISSING":"FORBIDDEN_PUBLICATION_PATH",target};
}
export function inspectPay54FirstPartyHtmlDependencies(sourceRoot=ROOT){
 const root=resolve(sourceRoot);
 const inventory=inspectPay54StaticSiteCandidate(root);
 const candidates=new Set(inventory.candidatePaths);
 let count=0;
 const findings=[],summary={CANDIDATE_INCLUDED:0,CANDIDATE_MISSING:0,
  FORBIDDEN_PUBLICATION_PATH:0,REJECTED_URL:0,REJECTED_TRAVERSAL:0,
  REJECTED_PATH:0,INVALID_ENCODING:0};
 for(const page of inventory.candidatePaths.filter(p=>PAGE.test(p))){
  const html=readFileSync(join(root,page),"utf8");
  const markup=projectPay54HtmlResourceMarkup(html);
  for(const match of markup.matchAll(ATTRIBUTE)){
   const raw=match[2].trim();
   if(/^(?:https?:|data:|mailto:|tel:|#|\/\/)/i.test(raw))continue;
   if(++count>MAX_REFS)throw new Error("PAY54_HTML_DEPENDENCIES_TOO_MANY");
   const classified=classify(page,raw,candidates);
   summary[classified.status]++;
   if(classified.status!=="CANDIDATE_INCLUDED"){
    findings.push(Object.freeze({
     page,target:classified.target,status:classified.status
    }));
   }
  }
 }
 return Object.freeze({
  schema:"pay54.html-firstparty-publication-dependencies.v1",
  candidateCount:inventory.candidateCount,
  checkedReferences:count,
  classification:Object.freeze({...summary}),
  findings:Object.freeze(findings),
  publicDependencyGraphComplete:findings.length===0,
  activePagesObserved:false,
  liveDeploymentAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
