"use strict";

/**
 * PAY54 item 705 — bounded static JavaScript module/worker dependency review.
 *
 * This is an additional source-safety signal, not a JavaScript AST, dependency
 * bundler or proof of complete runtime calls. It never executes application JS.
 */
import {readFileSync} from "node:fs";
import {resolve,join,posix} from "node:path";
import {fileURLToPath} from "node:url";
import {inspectPay54StaticSiteCandidate}
 from "./pay54-static-site-candidate-inventory.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const LITERAL=/(?:\bimport\s*(?:[\s\S]{0,120}?\s+from\s*)?|\bimport\s*\(|\bnew\s+(?:Worker|SharedWorker)\s*\(|\bimportScripts\s*\()\s*["']([^"'\r\n]{1,250})["']/g;
const DYNAMIC=/\bimport\s*\(\s*(?!["'])/g;
const MAX_FILES=500,MAX_REFS=4000;
export function inspectPay54StaticJsImports(sourceRoot=ROOT){
 const root=resolve(sourceRoot);
 const inventory=inspectPay54StaticSiteCandidate(root);
 const available=new Set(inventory.candidatePaths);
 const js=inventory.candidatePaths.filter(x=>/^assets\/js\//.test(x)&&/\.m?js$/i.test(x));
 if(js.length>MAX_FILES)throw new Error("PAY54_JS_IMPORT_FILE_LIMIT");
 const findings=[];
 let references=0,dynamicExpressions=0;
 for(const file of js){
  const source=readFileSync(join(root,file),"utf8");
  if(source.length>3_000_000)throw new Error("PAY54_JS_IMPORT_FILE_OVERSIZED");
  for(const m of source.matchAll(LITERAL)){
   if(++references>MAX_REFS)throw new Error("PAY54_JS_IMPORT_REFERENCE_LIMIT");
   const raw=m[1],short=raw.split(/[?#]/,1)[0];
   if(/^(?:https?:|\/\/|data:|blob:)/i.test(raw)){
    findings.push(Object.freeze({file,kind:"REMOTE_OR_DYNAMIC_MODULE",target:null}));
    continue;
   }
   if(!/^\.{1,2}\//.test(short)){
    findings.push(Object.freeze({file,kind:"UNRESOLVED_BARE_MODULE",target:null}));
    continue;
   }
   const target=posix.normalize(posix.join(posix.dirname(file),short));
   if(target.startsWith("../")||target.startsWith("/")||
    target.split("/").includes("..")||!available.has(target)){
    findings.push(Object.freeze({
     file,kind:!available.has(target)?"MISSING_JS_IMPORT":"UNSAFE_JS_IMPORT",
     target:target.startsWith("../")?null:target
    }));
   }
  }
  for(const ignored of source.matchAll(DYNAMIC)){
   if(++dynamicExpressions>MAX_REFS)throw new Error("PAY54_JS_IMPORT_DYNAMIC_LIMIT");
  }
 }
 return Object.freeze({
  schema:"pay54.static-js-import-review.v1",
  scriptFilesReviewed:js.length,
  literalReferencesReviewed:references,
  dynamicImportExpressions:dynamicExpressions,
  findings:Object.freeze(findings),
  staticReferencesNonfailing:findings.length===0,
  runtimeDependencyGraphIndependentlyVerified:false,
  dynamicImportReviewRequired:dynamicExpressions>0,
  customerFinancialExecutionReviewed:false,
  productionRelease:"BLOCKED"
 });
}
