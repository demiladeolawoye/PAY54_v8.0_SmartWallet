"use strict";

/**
 * PAY54 item 546 — offline founder artifact integrity verification.
 *
 * Re-checks every file against the untrusted manifest supplied with an
 * extracted preview. Never trusts arbitrary artifact paths, opens a browser,
 * connects to GitHub, or treats an unsigned manifest as provenance proof.
 */
import {readFileSync} from "node:fs";
import {resolve,join} from "node:path";
import {createHash} from "node:crypto";
import {inspectPay54PublicationTree}
 from "./pay54-publication-tree-inspector.mjs";

const SHA40=/^[a-f0-9]{40}$/;
const SHA64=/^[a-f0-9]{64}$/;
const digest=bytes=>createHash("sha256").update(bytes).digest("hex");
export function verifyPay54OfflineFounderPreview(directory){
 if(typeof directory!=="string"||!directory.trim()){
  throw new TypeError("PAY54_PREVIEW_VERIFY_DIRECTORY_REQUIRED");
 }
 const root=resolve(directory);
 const tree=inspectPay54PublicationTree(root);
 const failures=[];
 if(!tree.sourcePolicyPassed)failures.push("PUBLICATION_TREE_DENIED");
 let manifest;
 try{
  const bytes=readFileSync(join(root,"preview-manifest.json"));
  if(bytes.length>300_000)throw new Error("OVERSIZE_MANIFEST");
  manifest=JSON.parse(bytes.toString("utf8"));
 }catch{
  failures.push("MANIFEST_UNAVAILABLE");
 }
 if(manifest){
  if(manifest.schema!=="pay54.offline-founder-preview-manifest.v1"||
   !SHA40.test(manifest.sourceCommitSha??"")||
   !SHA64.test(manifest.visualTreeSha256??"")||
   manifest.scriptsIncluded!==false||
   manifest.liveBankingEnabled!==false||
   manifest.previewHosted!==false||
   manifest.productionRelease!=="BLOCKED"||
   !Array.isArray(manifest.files)||manifest.files.length>500){
   failures.push("INVALID_MANIFEST_SCHEMA");
  }else{
   const recorded=new Map();
   for(const item of manifest.files){
    if(typeof item?.path!=="string"||!item.path||
     !SHA64.test(item.sha256??"")||
     !Number.isSafeInteger(item.bytes)||item.bytes<0||
     item.path.startsWith("/")||item.path.split("/").some(p=>p===""||p===".."||p===".")||
     recorded.has(item.path)){
     failures.push("UNSAFE_MANIFEST_ENTRY");continue;
    }
    recorded.set(item.path,item);
   }
   const current=tree.files.filter(x=>x.path!=="preview-manifest.json");
   if(current.length!==recorded.size){
    failures.push("PREVIEW_FILE_COUNT_MISMATCH");
   }
   for(const file of current){
    const expected=recorded.get(file.path);
    if(!expected||expected.bytes!==file.bytes||expected.sha256!==file.sha256){
     failures.push("PREVIEW_ASSET_INTEGRITY_FAILED");break;
    }
   }
   const fileSummary=digest(Buffer.from(current.map(f=>
    [f.path,f.bytes,f.sha256].join("\0")).join("\n"),"utf8"));
   if(fileSummary!==manifest.visualTreeSha256){
    failures.push("PREVIEW_TREE_DIGEST_MISMATCH");
   }
  }
 }
 const html=readFileSync(join(root,"index.html"),"utf8");
 if(!html.includes("PAY54 OFFLINE VISUAL PREVIEW")||
  !html.includes("script-src 'none'")||
  !html.includes("connect-src 'none'")||
  /<script\b/i.test(html)){
  failures.push("ACTIVE_PREVIEW_HTML_DENIED");
 }
 return Object.freeze({
  schema:"pay54.offline-founder-artifact-verify.v1",
  sourceCommitSha:SHA40.test(manifest?.sourceCommitSha??"")?
   manifest.sourceCommitSha:null,
  failures:Object.freeze([...new Set(failures)]),
  localArtifactIntegrityPassed:failures.length===0,
  independentGithubOriginVerified:false,
  previewHosted:false,
  realMoneyEnabled:false,
  releaseAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
