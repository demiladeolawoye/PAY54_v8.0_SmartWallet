"use strict";

/**
 * PAY54 implementation 401: read-only external-script provenance inventory.
 * No CDN request is executed. Missing integrity metadata is a review finding,
 * not evidence that an actual script is compromised.
 */
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {inspectPay54StaticSiteCandidate}
 from "./pay54-static-site-candidate-inventory.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const SCRIPT=/<script\b([^>]*)>/gi;
const ATTR=/([a-zA-Z][\w:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
function attrs(source){
 const map=new Map();
 for(const match of source.matchAll(ATTR)){
  map.set(match[1].toLowerCase(),match[2]??match[3]??match[4]??"");
 }
 return map;
}
export function auditPay54ExternalScripts(sourceRoot=ROOT){
 const candidate=inspectPay54StaticSiteCandidate(sourceRoot);
 const findings=[],externalScripts=[];
 for(const page of candidate.candidatePaths.filter(path=>path.endsWith(".html"))){
  const html=readFileSync(resolve(sourceRoot,page),"utf8")
   .replace(/<!--[\s\S]*?-->/g,"");
  for(const script of html.matchAll(SCRIPT)){
   const a=attrs(script[1]);
   const src=a.get("src");
   if(!src||!/^https?:\/\//i.test(src))continue;
   let parsed;
   try{parsed=new URL(src);}catch{
    findings.push(Object.freeze({page,ruleId:"MALFORMED_REMOTE_SCRIPT"}));
    continue;
   }
   const integrity=a.get("integrity")??"";
   const crossorigin=a.get("crossorigin")??"";
   const integrityConfigured=/^(?:sha256|sha384|sha512)-[A-Za-z0-9+/=]+(?:\s+(?:sha256|sha384|sha512)-[A-Za-z0-9+/=]+)*$/.test(integrity);
   const info=Object.freeze({
    page,origin:parsed.origin,
    integrityConfigured,
    crossoriginConfigured:crossorigin!=="",
    sourceReviewOnly:true
   });
   externalScripts.push(info);
   if(parsed.protocol!=="https:"){
    findings.push(Object.freeze({page,origin:parsed.origin,ruleId:"INSECURE_EXTERNAL_SCRIPT"}));
   }
   if(!integrityConfigured){
    findings.push(Object.freeze({page,origin:parsed.origin,ruleId:"MISSING_VALID_SRI"}));
   }
  }
 }
 return Object.freeze({
  schema:"pay54.external-script-source-review.v1",
  externalScriptCount:externalScripts.length,
  externalScripts:Object.freeze(externalScripts),
  findings:Object.freeze(findings),
  manualIntegrityReviewRequired:findings.length>0,
  externalBytesVerified:false,
  pinnedVersionVerified:false,
  productionRelease:"BLOCKED"
 });
}
