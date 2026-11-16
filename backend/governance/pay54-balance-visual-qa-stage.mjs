"use strict";

/**
 * PAY54 Batch 17 — restricted current-dashboard visual QA fixture.
 *
 * Copies approved site candidates into a temporary local directory with
 * the existing fail-closed publication policy. Produces a downloadable
 * Actions QA archive, NOT a GitHub Pages deployment.
 */
import {mkdirSync, lstatSync, readdirSync} from "node:fs";
import {resolve,join} from "node:path";
import {fileURLToPath} from "node:url";
import {stagePay54SiteCandidate} from "./pay54-static-site-stage-builder.mjs";
import {inspectPay54PublicationTree} from "./pay54-publication-tree-inspector.mjs";

const ROOT=fileURLToPath(new URL("../../",import.meta.url));
export function createPay54BalanceVisualQA(directory,source=ROOT){
 if(typeof directory!=="string"||!directory.trim()){
  throw new TypeError("PAY54_VISUAL_QA_DIRECTORY_REQUIRED");
 }
 const target=resolve(directory);
 const stat=lstatSync(target);
 if(!stat.isDirectory()||stat.isSymbolicLink()||readdirSync(target).length){
  throw new Error("PAY54_VISUAL_QA_EMPTY_DIRECTORY_REQUIRED");
 }
 const staged=stagePay54SiteCandidate(resolve(source),target);
 const site=join(target,"site");
 const inventory=inspectPay54PublicationTree(site);
 if(!inventory.sourcePolicyPassed||inventory.fileCount!==staged.candidateCount||
   !inventory.files.some(x=>x.path==="dashboard.html")||
   inventory.files.some(x=>/(?:^|\/)(?:backend|docs|infrastructure|\.github)(?:\/|$)/i.test(x.path))){
  throw new Error("PAY54_VISUAL_QA_PUBLICATION_TREE_REFUSED");
 }
 return Object.freeze({
  schema:"pay54.batch17.visual-qa-source.v1",
  fileCount:inventory.fileCount,
  sourceManifestSha256:inventory.manifestSha256,
  sourceOnly:true,
  uploadedToPages:false,
  deployed:false,
  financeEnabled:false,
  productionRelease:"BLOCKED"
 });
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const result=createPay54BalanceVisualQA(process.argv[2]);
  process.stdout.write(JSON.stringify(result)+"\n");
 }catch(error){
  process.stderr.write(
   JSON.stringify({error:error?.message??"PAY54_VISUAL_QA_FAILED"})+"\n"
  );
  process.exitCode=1;
 }
}
