"use strict";

/*
 * PAY54 Batch 11 item 294 — offline GitHub Actions dependency pinning audit.
 * Version tags, including major-version tags, are mutable references.
 * This is an inventory, not a signature verification or permission to deploy.
 */
const SHA40=/^[a-f0-9]{40}$/;
const PATH=/^\.github\/workflows\/[a-z0-9_.-]+\.ya?ml$/i;
const USE=/^\s*(?:-\s*)?uses:\s*["']?([^"'#\s]+)["']?/gm;
function classify(reference){
 if(reference.startsWith("./"))return {kind:"LOCAL",immutable:false};
 if(reference.startsWith("docker://"))return {
  kind:/@sha256:[a-f0-9]{64}$/i.test(reference)?"CONTAINER_DIGEST":"MUTABLE_CONTAINER",
  immutable:/@sha256:[a-f0-9]{64}$/i.test(reference)
 };
 const split=reference.lastIndexOf("@");
 if(split<0)return {kind:"UNPINNED",immutable:false};
 const path=reference.slice(0,split),version=reference.slice(split+1);
 if(!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.\/-]+)?$/.test(path))
  return {kind:"INVALID",immutable:false};
 return {kind:SHA40.test(version)?"COMMIT_SHA":"MUTABLE_TAG",
  immutable:SHA40.test(version)};
}
export function assessPay54ActionsDependencyInventory({workflows}={}){
 if(!Array.isArray(workflows)||workflows.length===0||workflows.length>150)
  throw new TypeError("PAY54_ACTIONS_INVENTORY_INVALID");
 const seen=new Set();
 const findings=[];
 for(const entry of workflows){
  if(!entry||typeof entry!=="object"||Array.isArray(entry)||
     typeof entry.path!=="string"||!PATH.test(entry.path)||
     typeof entry.content!=="string"||entry.content.length>250000||
     seen.has(entry.path))throw new TypeError("PAY54_ACTIONS_INVENTORY_INVALID");
  seen.add(entry.path);
  let match;
  USE.lastIndex=0;
  while((match=USE.exec(entry.content))!==null){
   const reference=match[1];
   const result=classify(reference);
   findings.push(Object.freeze({
    workflowPath:entry.path,
    actionReference:reference,
    kind:result.kind,immutableReference:result.immutable
   }));
  }
 }
 return Object.freeze({
  assessedWorkflowCount:workflows.length,
  actionCount:findings.length,
  actions:Object.freeze(findings),
  mutableExternalActionCount:findings.filter(x=>
   !x.immutableReference&&x.kind!=="LOCAL").length,
  allExternalReferencesImmutable:findings.every(x=>
   x.immutableReference||x.kind==="LOCAL"),
  sourceEvidenceOnly:true,
  actionSignatureVerified:false,
  protectedWorkflowPermissionsVerified:false,
  deploymentApproved:false,
  financialExecutionEnabled:false,
  productionRelease:"BLOCKED"
 });
}
