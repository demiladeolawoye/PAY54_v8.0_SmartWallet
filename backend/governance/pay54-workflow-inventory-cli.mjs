"use strict";

import {readdirSync,readFileSync,lstatSync} from "node:fs";
import {join,resolve,relative,sep} from "node:path";
import {fileURLToPath} from "node:url";
import {assessPay54PullRequestWorkflowTrust} from "./pay54-pr-workflow-trust-audit.mjs";
import {assessPay54ActionsDependencyInventory} from "./pay54-actions-dependency-audit.mjs";

/*
 * PAY54 Batch 11 item 300 — real local workflow file inventory.
 * Read-only: no API, network, secrets, cloud, action execution, deployment
 * or untrusted source evaluation. Script generates review findings only.
 */
const ROOT=fileURLToPath(new URL("../../",import.meta.url));
const DIR=".github/workflows";
const LIMIT=150;
const MAX_BYTES=250000;
export function inspectPay54WorkflowSources(root=ROOT){
 const directory=resolve(root,DIR), relativePrefix=DIR+"/";
 const names=readdirSync(directory).filter(name=>/^[a-z0-9_.-]+\.ya?ml$/i.test(name)).sort();
 if(names.length===0||names.length>LIMIT){
  throw new Error("PAY54_WORKFLOW_DISCOVERY_INVALID");
 }
 const workflowSources=names.map(name=>{
  const path=join(directory,name),stat=lstatSync(path);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.size>MAX_BYTES||
    relative(directory,path).startsWith(".."+sep)){
   throw new Error("PAY54_WORKFLOW_DISCOVERY_INVALID");
  }
  return {path:relativePrefix+name,content:readFileSync(path,"utf8")};
 });
 const trust=assessPay54PullRequestWorkflowTrust({workflows:workflowSources});
 const actions=assessPay54ActionsDependencyInventory({workflows:workflowSources});
 return Object.freeze({
  workflowCount:workflowSources.length,
  workflows:Object.freeze(workflowSources.map(x=>x.path)),
  highRiskWorkflowCount:trust.highRiskWorkflowCount,
  flaggedWorkflowPaths:Object.freeze(trust.findings
    .filter(x=>x.needsIndependentReview).map(x=>x.path)),
  mutableExternalActionCount:actions.mutableExternalActionCount,
  mutableReferences:Object.freeze(actions.actions.filter(x=>
   !x.immutableReference&&x.kind!=="LOCAL").map(x=>Object.freeze({
     workflowPath:x.workflowPath,
     actionReference:x.actionReference,
     kind:x.kind
   }))),
  inventoryReviewedFromDisk:true,
  yamlSemanticsIndependentlyVerified:false,
  upstreamActionsVerified:false,
  githubPagesSettingsVerified:false,
  publicationApproved:false,
  stagingRelease:"BLOCKED",
  productionRelease:"BLOCKED",
  cloudProvisioningEnabled:false,
  financialExecutionEnabled:false
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{
  const report=inspectPay54WorkflowSources();
  process.stdout.write(JSON.stringify(report,null,2)+"\n");
 }catch{
  process.stderr.write("PAY54_WORKFLOW_DISCOVERY_INVALID\n");
  process.exitCode=1;
 }
}
