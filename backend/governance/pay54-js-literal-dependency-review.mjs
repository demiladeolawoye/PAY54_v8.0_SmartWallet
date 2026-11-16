"use strict";

/**
 * PAY54 item 453 — bounded read-only JavaScript literal dependency review.
 * Detects literal module imports and new URL('asset', import.meta.url).
 * Nonliteral imports are explicitly reported as unresolved; this is NOT a
 * complete dynamic runtime graph or publication approval.
 */
import {readFileSync} from "node:fs";
import {resolve,posix} from "node:path";
import {fileURLToPath} from "node:url";
import {inspectPay54StaticSiteCandidate}
 from "./pay54-static-site-candidate-inventory.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const IMPORT=/\b(?:import\s*(?:\(\s*|[^;\n]*?\s+from\s*)|export\s+[^;\n]*?\s+from\s*)(["'])([^"'\n]+)\1/g;
const URL_LITERAL=/\bnew\s+URL\s*\(\s*(["'])([^"'\n]+)\1\s*,\s*import\.meta\.url\s*\)/g;
const DYNAMIC=/\bimport\s*\(\s*(?!["'])/g;
const PATH=/^\.{1,2}\//;
export function inspectPay54JsLiteralDependencies(sourceRoot=ROOT){
 const inventory=inspectPay54StaticSiteCandidate(sourceRoot);
 const candidates=new Set(inventory.candidatePaths);
 const unresolved=[],missing=[],checked=[];
 for(const page of inventory.candidatePaths.filter(p=>/\.(?:js|mjs)$/i.test(p))){
  const text=readFileSync(resolve(sourceRoot,page),"utf8");
  const references=[
   ...[...text.matchAll(IMPORT)].map(x=>x[2]),
   ...[...text.matchAll(URL_LITERAL)].map(x=>x[2])
  ];
  if(DYNAMIC.test(text))unresolved.push(Object.freeze({page,reason:"NONLITERAL_IMPORT"}));
  for(const ref of references){
   if(!PATH.test(ref)){
    unresolved.push(Object.freeze({page,reason:"NON_RELATIVE_SPECIFIER"}));continue;
   }
   const path=posix.normalize(posix.join(posix.dirname(page),ref));
   if(path.startsWith("../")||!path.startsWith("assets/")){
    unresolved.push(Object.freeze({page,reason:"OUTSIDE_PUBLIC_ASSETS"}));continue;
   }
   if(!candidates.has(path)){
    missing.push(Object.freeze({page,dependency:path}));continue;
   }
   checked.push(Object.freeze({page,dependency:path}));
  }
 }
 return Object.freeze({
  schema:"pay54.js-literal-source-dependencies.v1",
  checked:Object.freeze(checked),
  missing:Object.freeze(missing),
  unresolved:Object.freeze(unresolved),
  literalSourceReviewPassed:missing.length===0,
  fullRuntimeDependencyGraphVerified:false,
  publicationAuthorised:false,
  productionRelease:"BLOCKED"
 });
}
