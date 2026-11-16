"use strict";

/**
 * PAY54 implementation 368 — read-only, fail-closed HTML asset-link audit.
 * Does not package files, publish a website, or authorise release.
 */
import {readFileSync} from "node:fs";
import {resolve, posix} from "node:path";
import {fileURLToPath} from "node:url";
import {inspectPay54StaticSiteCandidate} from "./pay54-static-site-candidate-inventory.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const ATTRIBUTE=/(?<![\w:-])(?:src|href)\s*=\s*(?:(["'])(.*?)\1|([^\s>]+))/gi;
const RESPONSIVE=/(?<![\w:-])srcset\s*=\s*(?:(["'])(.*?)\1|([^\s>]+))/gi;
const PAGE=/^[^/]+\.html$/i;
const EXTERNAL=/^(?:https?:|mailto:|tel:|data:|blob:|javascript:|\/\/)/i;
const SCHEME=/^[a-z][a-z\d+.-]*:/i;

export function auditPay54StaticSiteLinks(sourceRoot=ROOT){
 const inventory=inspectPay54StaticSiteCandidate(sourceRoot);
 const candidates=new Set(inventory.candidatePaths);
 const missing=[],rejected=[],external=[];
 let checked=0;
 for(const page of inventory.candidatePaths.filter(p=>PAGE.test(p))){
  const html=readFileSync(resolve(sourceRoot,page),"utf8");
  // Responsive image candidate sets require dedicated parsing and byte-level
  // review. Never silently certify them as a complete first-party graph.
  for(const candidate of html.matchAll(RESPONSIVE)){
   const raw=(candidate[2]??candidate[3]??"").trim();
   if(raw){
    rejected.push({page,reference:"srcset",reason:"RESPONSIVE_SOURCE_SET_REQUIRES_REVIEW"});
   }
  }
  for(const match of html.matchAll(ATTRIBUTE)){
   const raw=(match[2]??match[3]??"").trim();
   if(!raw||raw.startsWith("#"))continue;
   if(EXTERNAL.test(raw)){
    if(/^(?:javascript:|data:|blob:|\/\/)/i.test(raw)){
     rejected.push({page,reference:raw,reason:"UNSAFE_URL"});
    }else external.push({page,reference:raw});
    continue;
   }
   if(SCHEME.test(raw)||raw.startsWith("/")||raw.includes("\\")||/%2f|%5c|%00/i.test(raw)){
    rejected.push({page,reference:raw,reason:"UNSAFE_PATH"});continue;
   }
   const pathOnly=raw.split(/[?#]/,1)[0];
   let decoded;
   try{decoded=decodeURIComponent(pathOnly);}catch{
    rejected.push({page,reference:raw,reason:"INVALID_ENCODING"});continue;
   }
   if(decoded.includes("\\")||decoded.includes("\0")||decoded.split("/").includes("..")){
    rejected.push({page,reference:raw,reason:"PATH_TRAVERSAL"});continue;
   }
   const normalized=posix.normalize(decoded.startsWith("/")?decoded.slice(1):posix.join(posix.dirname(page),decoded));
   if(normalized==="."||normalized.startsWith("../")||normalized.startsWith("/")||normalized.startsWith(".github/")||normalized.startsWith("backend/")){
    rejected.push({page,reference:raw,reason:"OUTSIDE_SITE"});continue;
   }
   checked++;
   if(!candidates.has(normalized))missing.push({page,reference:raw,resolved:normalized});
  }
 }
 return Object.freeze({
  checkedLocalReferences:checked,
  externalReferences:Object.freeze(external),
  missingLocalReferences:Object.freeze(missing),
  rejectedReferences:Object.freeze(rejected),
  complete:missing.length===0&&rejected.length===0,
  sourceAuditOnly:true,
  actualDeploymentInspected:false,
  publicationAuthorized:false,
  productionRelease:"BLOCKED"
 });
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const result=auditPay54StaticSiteLinks();
  process.stdout.write(JSON.stringify(result,null,2)+"\n");
  if(!result.complete)process.exitCode=1;
 }catch{
  process.stderr.write("PAY54_STATIC_SITE_LINK_AUDIT_FAILED\n");
  process.exitCode=1;
 }
}
