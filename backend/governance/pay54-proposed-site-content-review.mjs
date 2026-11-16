"use strict";

import {createHash} from "node:crypto";
import {assessPay54PublicSiteManifest} from "./pay54-public-site-manifest.mjs";

/*
 * PAY54 Batch 11 item 283. Review PROPOSED static file bytes only.
 * The caller supplies an in-memory collection; no filesystem, network,
 * Pages API or deployed artefacts are inspected by this policy.
 * Findings never output matching source lines, secrets or file contents.
 */
const MAX_FILES=200;
const MAX_FILE_BYTES=512*1024;
const TOTAL_BYTES=4*1024*1024;
const SENSITIVE=[
  ["PRIVATE_KEY",/-----BEGIN (?:RSA |EC |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/i],
  ["DATABASE_URL",/\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s"'<>]+/i],
  ["CREDENTIAL_ASSIGNMENT",/\b(?:password|secret_key|client_secret|api_key|access_token|private_key)\s*[:=]\s*["'][^\s"']{8,}["']/i],
  ["CLOUD_ACCESS_KEY",/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ["SOURCE_MAP_REFERENCE",/\/\/[#@]\s*sourceMappingURL\s*=/i],
  ["ENV_CONFIG",/(?:^|\n)\s*(?:DATABASE_URL|POSTGRES_PASSWORD|AWS_SECRET_ACCESS_KEY|STRIPE_SECRET_KEY)\s*=/i]
];
const JS_UNSAFE=[
  ["HTTP_SCRIPT",/<script\b[^>]*\bsrc\s*=\s*["']http:\/\//i],
  ["HTTP_FORM",/<form\b[^>]*\baction\s*=\s*["']http:\/\//i]
];
function plainObject(value){
 return value!==null && typeof value==="object" &&
  !Array.isArray(value) && Object.getPrototypeOf(value)===Object.prototype;
}
export function assessPay54ProposedSiteContent({files}={}){
 if(!Array.isArray(files)||files.length===0||files.length>MAX_FILES){
  throw new Error("PAY54_SITE_CONTENT_INVENTORY_INVALID");
 }
 let bytes=0;
 const paths=[];
 const normalized=[];
 for(const item of files){
  if(!plainObject(item)||Object.keys(item).sort().join(",")!=="content,path"||
     typeof item.path!=="string"||typeof item.content!=="string"){
    throw new Error("PAY54_SITE_CONTENT_INVENTORY_INVALID");
  }
  const size=Buffer.byteLength(item.content,"utf8");
  bytes+=size;
  if(size>MAX_FILE_BYTES||bytes>TOTAL_BYTES){
    throw new Error("PAY54_SITE_CONTENT_LIMIT");
  }
  paths.push(item.path);
  normalized.push({path:item.path,content:item.content,size});
 }
 const manifest=assessPay54PublicSiteManifest({paths});
 const findings=[];
 for(const entry of normalized){
   for(const [rule,pattern] of [...SENSITIVE,...JS_UNSAFE]){
     if(pattern.test(entry.content)){
       findings.push(Object.freeze({path:entry.path,rule}));
     }
   }
 }
 return Object.freeze({
  sourceManifestStructurallySafe:manifest.sourceManifestStructurallySafe,
  disallowedPaths:manifest.disallowedPaths,
  inspectedFileCount:normalized.length,
  inspectedBytes:bytes,
  findings:Object.freeze(findings),
  candidateDigest:createHash("sha256")
    .update(normalized.map(entry=>
      JSON.stringify([entry.path,entry.size,
        createHash("sha256").update(entry.content).digest("hex")])
    ).sort().join("\n")).digest("hex"),
  candidateContentScreenPassed:manifest.sourceManifestStructurallySafe &&
    findings.length===0,
  actualPagesContentInspected:false,
  independentSecretsScanCompleted:false,
  publicationApproved:false,
  deploymentApproved:false,
  productionRelease:"BLOCKED"
 });
}
