"use strict";

/**
 * PAY54 525 — offline, inert founder dashboard visual snapshot.
 * This does not execute source JavaScript or build a functional wallet.
 * Copies only approved local CSS/images/fonts. Restricts CSP, blocks forms,
 * frames and network connections. No hosted deployment occurs here.
 */
import {readFileSync,writeFileSync,mkdirSync,readdirSync,lstatSync,rmSync,copyFileSync,renameSync} from "node:fs";
import {randomUUID} from "node:crypto";
import {resolve,relative,join,dirname,isAbsolute,extname} from "node:path";
import {inspectPay54StaticSiteCandidate} from "./pay54-static-site-candidate-inventory.mjs";
import {auditPay54CssAssetLinks} from "./pay54-css-asset-link-audit.mjs";

const MIME_EXT=new Set([".css",".svg",".png",".webp",".jpg",".jpeg",".gif",".ico",".woff",".woff2"]);
const MAX_HTML=400_000;
const blockOverlap=(one,two)=>{
 const r=relative(one,two);
 return !r||(!r.startsWith("..")&&!isAbsolute(r));
};
const POLICY=[
 "default-src 'none'",
 "style-src 'self' 'unsafe-inline'",
 "img-src 'self' data:",
 "font-src 'self'",
 "script-src 'none'",
 "script-src-attr 'none'",
 "connect-src 'none'",
 "form-action 'none'",
 "frame-src 'none'",
 "worker-src 'none'",
 "object-src 'none'",
 "base-uri 'none'",
 "navigate-to 'none'"
].join("; ");

export function buildPay54DashboardOfflinePreview(sourceRoot,emptyOutputRoot){
 if(typeof sourceRoot!=="string"||!sourceRoot.trim()||
  typeof emptyOutputRoot!=="string"||!emptyOutputRoot.trim()){
  throw new TypeError("PAY54_PREVIEW_ROOTS_REQUIRED");
 }
 const source=resolve(sourceRoot),target=resolve(emptyOutputRoot);
 if(blockOverlap(source,target)||blockOverlap(target,source)){
  throw new Error("PAY54_PREVIEW_OVERLAPPING_ROOTS");
 }
 const info=lstatSync(target);
 if(!info.isDirectory()||info.isSymbolicLink()||readdirSync(target).length){
  throw new Error("PAY54_PREVIEW_EMPTY_TARGET_REQUIRED");
 }
 const inventory=inspectPay54StaticSiteCandidate(source);
 if(!inventory.candidatePaths.includes("dashboard.html")){
  throw new Error("PAY54_PREVIEW_DASHBOARD_NOT_IN_CANDIDATE");
 }
 const css=auditPay54CssAssetLinks(source);
 if(css.rejectedReferences.length||css.missingLocalReferences.length||
  css.externalReferences.length){
  throw new Error("PAY54_PREVIEW_CSS_DEPENDENCY_UNVERIFIED");
 }
 let html=readFileSync(join(source,"dashboard.html"),"utf8");
 if(Buffer.byteLength(html)>MAX_HTML||!/<body\b/i.test(html)||
  !/<head\b/i.test(html)||!/<\/body>/i.test(html)){
  throw new Error("PAY54_PREVIEW_HTML_INVALID");
 }
 if(/<\s*(?:iframe|object|embed|svg|math)\b/i.test(html)){
  throw new Error("PAY54_PREVIEW_EMBEDDED_CONTENT_DENIED");
 }
 // No runtime scripts, event handler attributes, forms or active redirects.
 html=html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,"");
 if(/<script\b/i.test(html)||/\son[a-z]+\s*=/i.test(html)){
  throw new Error("PAY54_PREVIEW_UNSAFE_HTML_ATTRIBUTE");
 }
 html=html.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?content-security-policy["']?[^>]*>/gi,"");
 html=html.replace(/<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi,"");
 html=html.replace(/<form\b[^>]*>/gi,'<div class="p54-preview-inert-form">')
  .replace(/<\/form\s*>/gi,"</div>");
 html=html.replace(/<button\b/gi,"<button disabled")
  .replace(/<input\b/gi,"<input disabled")
  .replace(/<select\b/gi,"<select disabled")
  .replace(/<textarea\b/gi,"<textarea disabled");
 html=html.replace(/<a\b[^>]*>/gi,'<span class="p54-preview-link">')
  .replace(/<\/a\s*>/gi,"</span>");
 html=html.replace(/<link\b[^>]*>/gi,tag=>
  /\brel\s*=\s*["\']?stylesheet["\']?/i.test(tag)?"":tag);
 // Restore local stylesheet references from the original source's exact tags,
 // leaving any script, modulepreload or remote link outside the preview.
 const original=readFileSync(join(source,"dashboard.html"),"utf8");
 const cssLinks=[...original.matchAll(/<link\b[^>]*>/gi)]
  .map(x=>x[0]).filter(x=>/\brel\s*=\s*["']?stylesheet["']?/i.test(x));
 for(const link of cssLinks){
  const m=link.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
  const path=m?.[2]?.split(/[?#]/,1)[0]??"";
  if(!/^assets\/css\/[a-zA-Z0-9_./-]+\.css$/.test(path)||
   path.split("/").includes("..")||
   !inventory.candidatePaths.includes(path)){
   throw new Error("PAY54_PREVIEW_STYLESHEET_NOT_APPROVED");
  }
 }
 const banner='<aside role="note" class="p54-preview-disclosure">PAY54 OFFLINE VISUAL PREVIEW — SYNTHETIC DISPLAY ONLY. All actions are disabled. No real banking, customer data or payment processing.</aside>';
 const hardening='<style>.p54-preview-disclosure{position:relative;z-index:999999;background:#102b54;color:#fff;padding:12px 16px;font:600 14px/1.5 system-ui}.p54-preview-link{cursor:default}button,input,select,textarea{pointer-events:none}</style>';
 html=html.replace(/<head\b[^>]*>/i,match=>match+
  '\n<meta http-equiv="Content-Security-Policy" content="'+POLICY+'">\n');
 html=html.replace(/<\/head>/i,cssLinks.join("\n")+hardening+"\n</head>");
 html=html.replace(/<body\b[^>]*>/i,match=>match+"\n"+banner);
 // Remove identifying demo profile strings without touching real user storage.
 html=html.replace(/(<[^>]*id="profileName"[^>]*>)[^<]*(<\/[^>]+>)/i,
  '$1Preview User$2');
 const temp=join(target,".pay54-preview-"+randomUUID());
 mkdirSync(temp,{recursive:false});
 try{
  const copied=[];
  for(const path of inventory.candidatePaths){
   if(!MIME_EXT.has(extname(path).toLowerCase()))continue;
   const from=join(source,path),to=join(temp,path);
   const meta=lstatSync(from);
   if(!meta.isFile()||meta.isSymbolicLink())throw new Error("PAY54_PREVIEW_SOURCE_UNSAFE");
   mkdirSync(dirname(to),{recursive:true});
   copyFileSync(from,to);
   copied.push(path);
  }
  writeFileSync(join(temp,"index.html"),html,{flag:"wx",mode:0o644});
  const final=join(target,"preview");
  // The caller supplied an empty target and all files are source-only.

  renameSync(temp,final);
  return Object.freeze({
   schema:"pay54.offline-founder-dashboard-preview.v1",
   outputDirectory:final,
   copiedVisualAssets:Object.freeze(copied),
   scriptsCopied:false,
   walletEnginesEnabled:false,
   realMoneyEnabled:false,
   networkConnectionsAllowed:false,
   sourceOnly:true,
   productionRelease:"BLOCKED"
  });
 }catch(error){rmSync(temp,{recursive:true,force:true});throw error;}
}
