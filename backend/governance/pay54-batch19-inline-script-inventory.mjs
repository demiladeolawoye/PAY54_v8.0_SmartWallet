"use strict";

/**
 * PAY54 item 688 — bounded first-party inline-script security inventory.
 * Hashes executable inline blocks so a reviewer can compare source revisions
 * without placing JavaScript, credentials or customer values in a PR comment.
 */
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {join,resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {inspectPay54StaticSiteCandidate}
 from "./pay54-static-site-candidate-inventory.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const SCRIPT=/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
const SHA=x=>createHash("sha256").update(x).digest("hex");
const DYNAMIC=/\b(?:eval\s*\(|new\s+Function\s*\(|fetch\s*\(|XMLHttpRequest\b|localStorage\b|sessionStorage\b)\b/i;
export function inspectPay54InlineScripts(root=ROOT){
 const base=resolve(root);
 const inventory=inspectPay54StaticSiteCandidate(base);
 const scripts=[];
 for(const page of inventory.candidatePaths.filter(p=>p.endsWith(".html"))){
  const html=readFileSync(join(base,page),"utf8");
  const activeHtml=html.replace(/<!--[\s\S]*?-->/g,"");
  if(html.length>3_000_000)throw new Error("PAY54_INLINE_SCRIPT_PAGE_OVERSIZED");
  let count=0;
  for(const m of activeHtml.matchAll(SCRIPT)){
   if(++count>300)throw new Error("PAY54_INLINE_SCRIPT_COUNT_LIMIT");
   const attr=m[1],body=m[2];
   if(/\bsrc\s*=/i.test(attr)||!body.trim())continue;
   const isData=/\btype\s*=\s*["'](?:application\/(?:json|ld\+json)|importmap)["']/i.test(attr);
   if(isData)continue;
   scripts.push(Object.freeze({
    page,ordinal:count,bytes:Buffer.byteLength(body),
    sha256:SHA(body),dynamicRuntimeReviewRequired:DYNAMIC.test(body)
   }));
  }
 }
 return Object.freeze({
  schema:"pay54.inline-script-inventory.v1",
  executableInlineScriptCount:scripts.length,
  scripts:Object.freeze(scripts),
  manualInlineScriptReviewRequired:scripts.length>0,
  scriptsIndependentlyAudited:false,
  externalScriptBytesAuthenticated:false,
  liveSiteScriptsVerified:false,
  productionRelease:"BLOCKED"
 });
}
