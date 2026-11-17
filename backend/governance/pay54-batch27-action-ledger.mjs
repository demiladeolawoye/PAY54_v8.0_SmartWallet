"use strict";

/**
 * PAY54 Batch 27 / 1145 — verifiable 120-action source ledger.
 *
 * The programme must never claim 120 implemented actions from a count of
 * promises or numbered roadmap paragraphs. Every action requires a unique,
 * tracked source/test/workflow/runbook marker. No cloud permissions needed.
 */
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";
const MIN=1068,MAX=1187;
const deny=()=>{throw new Error("PAY54_BATCH27_ACTION_LEDGER_DENIED");};
const SOURCE=/(?:Batch\s*27\s*[/:-]\s*|\btest\s*\(\s*["'])(10[6-9][0-9]|11[0-8][0-9])\b/gi;
export function assessPay54Batch27ActionSourceSet({
 sources,throughId=MAX
}={}){
 if(!Number.isInteger(throughId)||throughId<MIN||throughId>MAX||
    !sources||typeof sources!=="object"||Array.isArray(sources))deny();
 const expected=throughId-MIN+1;
 const entries=Object.entries(sources);
 if(!entries.length||entries.length>120)deny();
 const ids=new Set(),unmatched=[];
 for(const [path,source] of entries){
  if(typeof path!=="string"||
     !/(?:pay54-batch27|account-batch27)/i.test(path) ||
     typeof source!=="string"||source.length<20 ||
     source.length>2*1024*1024)deny();
  // Use a canonical first action per source/test file. Only the workflow
  // carries an independently committed second action (1144).
  const matched=[...source.matchAll(SOURCE)];
  const matches=path.endsWith("pay54-batch27-operational-evidence.yml")
   ? matched : matched.slice(0,1);
  if(matches.length===0){unmatched.push(path);continue;}
  // A single test file can repeat its own action ID in separate tests;
  // independently committed revisions to the same workflow can have
  // multiple distinct IDs. Cross-file action IDs remain unique.
  const localIds=new Set(matches.map(match=>Number(match[1])));
  for(const id of localIds){
   if(id<MIN || id>MAX ||ids.has(id))deny();
   ids.add(id);
  }
 }
 const missing=[];
 const checkedIds=new Set([...ids].filter(id=>id<=throughId));
 for(let id=MIN;id<=throughId;id++)if(!checkedIds.has(id))missing.push(id);
 return Object.freeze({
  schema:"pay54.batch27-verified-action-ledger.v1",
  expectedActionCount:expected,
  markedTrackedActions:checkedIds.size,
  missingActionIds:Object.freeze(missing),
  unmarkedTrackedPaths:Object.freeze(unmatched),
  rangeFullyCovered:missing.length===0&&unmatched.length===0 &&
    checkedIds.size===expected,
  sourceFilesAreActualDeployments:false,
  realWorldBlockersClosedByActionCounting:false,
  productionReleaseAuthorised:false
 });
}
export function inspectPay54Batch27TrackedActionLedger({
 throughId=MAX,cwd=resolve(import.meta.dirname,"../..")
}={}){
 if(typeof cwd!=="string")deny();
 let result;
 try{
  result=execFileSync("git",["ls-files","-z","--"],{
   cwd,encoding:"utf8",timeout:15000,maxBuffer:16*1024*1024,
   stdio:["ignore","pipe","ignore"]
  });
 }catch{deny();}
 const files=result.split("\0").filter(x=>
  /(?:pay54-batch27|account-batch27)/i.test(x));
 const sources=Object.create(null);
 for(const file of files){
  if(file.startsWith("/")||file.includes("\\")||
     file.split("/").some(x=>!x||x==="."||x===".."))deny();
  try{sources[file]=readFileSync(resolve(cwd,file),"utf8");}catch{deny();}
 }
 return assessPay54Batch27ActionSourceSet({sources,throughId});
}
