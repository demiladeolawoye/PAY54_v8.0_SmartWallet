"use strict";

/**
 * PAY54 item 558 — offline preview resource URL source check.
 * Supplementary to a restrictive CSP. Refuses scheme-relative URLs, mailto,
 * live APIs, external URLs, srcset and URL traversal without fetching them.
 */
const ATTR=/(?<![\w:-])\b(srcset|src|href|action|poster)\s*=\s*(?:(["'])(.*?)\2|([^\s>]+))/gi;
const LOCAL=/^assets\/(?:css|img|images|fonts)\/[A-Za-z0-9._/-]+(?:\?[A-Za-z0-9._=&%-]+)?$/;
const DATA_IMAGE=/^data:image\/(?:svg\+xml|png|jpeg|webp|gif);base64,[a-zA-Z0-9+/]+=*$/;
export function auditPay54OfflinePreviewResources(html){
 if(typeof html!=="string"||html.length>800_000){
  throw new TypeError("PAY54_PREVIEW_RESOURCES_HTML_REQUIRED");
 }
 const findings=[];
 let examined=0;
 for(const match of html.matchAll(ATTR)){
  examined++;
  const key=match[1].toLowerCase();
  const value=(match[3]??match[4]??"").trim();
  if(key==="srcset"){
   findings.push("RESPONSIVE_SOURCE_SET_REQUIRES_REVIEW");continue;
  }
  if(value===""||value.startsWith("#"))continue;
  if(DATA_IMAGE.test(value))continue;
  if(!LOCAL.test(value)||value.includes("..")||
   /%2f|%5c|%2e/i.test(value)){
   findings.push("REMOTE_OR_UNSAFE_RESOURCE_REFERENCE");
  }
 }
 return Object.freeze({
  schema:"pay54.offline-preview-url-policy.v1",
  examinedReferences:examined,
  findings:Object.freeze([...new Set(findings)]),
  sourceReferencesLocal:findings.length===0,
  networkRequestsPerformed:false,
  browserEnforcementVerified:false,
  productionRelease:"BLOCKED"
 });
}
