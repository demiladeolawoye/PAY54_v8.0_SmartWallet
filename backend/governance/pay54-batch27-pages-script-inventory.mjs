"use strict";
/**
 * Batch27/1108 — fail-closed static HTML/JS dependency inventory.
 * Browser-delivered bundle must not reference internal backend, source maps
 * or any known PAY54 development payment adapter.
 */
const deny=()=>{throw new Error("PAY54_PAGES_SCRIPT_DEPENDENCY_DENIED");};
const BLOCK=/^\/?(?:backend|infrastructure|docs|\.github)(?:\/|$)|(?:^|\/)linked-card-development\.js(?:$|\?)|\.map(?:$|\?)/i;
const SCRIPT=/<script\b[^>]*\bsrc\s*=\s*(["'])([^"'<>]+)\1[^>]*>/gi;
export function inspectPay54PagesScriptDependencies({html,jsSources={}}={}){
 if(typeof html!=="string"||!html.trim()||html.length>3*1024*1024||
    !jsSources||typeof jsSources!=="object"||Array.isArray(jsSources)||
    Object.keys(jsSources).length>5000)deny();
 const scripts=[],suspect=[];
 for(const m of html.matchAll(SCRIPT)){
  const raw=m[2];
  if(raw.includes("\\")||raw.includes("%")||raw.startsWith("//"))deny();
  let u;try{u=new URL(raw,"https://pay54.invalid/");}catch{deny();}
  if(u.origin!=="https://pay54.invalid"||u.hash)deny();
  const path=u.pathname.slice(1);
  if(!path||path.includes("..")||scripts.includes(path))deny();
  scripts.push(path);
  if(BLOCK.test(path))suspect.push(path);
 }
 for(const [file,source] of Object.entries(jsSources)){
  if(typeof file!=="string"||typeof source!=="string"||
     source.length>2*1024*1024||BLOCK.test(file))deny();
  if(/(?:\bimport\s*\(\s*[^'"]|\beval\s*\(|\bnew\s+Function\s*\()/i.test(source))
   suspect.push(file+":dynamic-code-execution");
  if(/sourceMappingURL\s*=|linked-card-development\.js/i.test(source))
   suspect.push(file+":development-or-sourcemap-reference");
 }
 return Object.freeze({
  schema:"pay54.pages-browser-dependency-audit.v1",
  externalScriptCount:scripts.length,
  suspectReferences:Object.freeze(suspect),
  browserReleaseCandidateSafe:suspect.length===0,
  remotePublishedBundleInspected:false,
  cashOrCardFundingApproved:false,
  deploymentAuthorised:false
 });
}
