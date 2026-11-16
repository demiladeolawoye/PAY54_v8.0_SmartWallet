"use strict";

/*
 * PAY54 Batch 11 / item 273 — exact-revision CI evidence lineage checker.
 * Release evidence for an older SHA must not be presented as passing on a
 * newer executable source revision. This function is offline and never
 * authorises deployment; GitHub API results still require external review.
 */
const SHA=/^[a-f0-9]{40}$/;
const MAX_RUN=Number.MAX_SAFE_INTEGER;
const REQUIRED=new Set([
 "PAY54 Backend Tests",
 "PAY54 Account Boundary Tests",
 "PAY54 Account Security Integration",
 "PAY54 Account Read Access Integration",
 "PAY54 Account Authentication and RLS Integration",
 "PAY54 Batch 10 Synthetic Role and Audit Source Tests"
]);

export function assessPay54SourceRevisionEvidence({
 expectedSha,workflowRuns
}={}){
 if(typeof expectedSha!=="string"||!SHA.test(expectedSha)||
    !Array.isArray(workflowRuns)||workflowRuns.length>100||
    workflowRuns.some(run=>!run||typeof run!=="object"||
      typeof run.name!=="string"||typeof run.headSha!=="string"||
      !SHA.test(run.headSha)||!Number.isSafeInteger(run.id)||
      run.id<1||run.id>MAX_RUN||
      !["success","failure","cancelled","skipped","pending","in_progress"].includes(run.conclusion))){
   throw new Error("PAY54_RELEASE_EVIDENCE_INVALID");
 }
 const checked=Object.freeze([...REQUIRED].sort().map(name=>{
   const candidates=workflowRuns.filter(x=>x.name===name&&x.headSha===expectedSha);
   const verified=candidates.some(x=>x.conclusion==="success");
   return Object.freeze({
     workflow:name,
     checkedOnTargetRevision:verified,
     successfulRunId:verified?
       candidates.find(x=>x.conclusion==="success").id:null
   });
 }));
 return Object.freeze({
  expectedSha,
  requiredWorkflowCount:REQUIRED.size,
  passingOnExactRevision:checked.filter(x=>x.checkedOnTargetRevision).length,
  sourceRegressionComplete:checked.every(x=>x.checkedOnTargetRevision),
  workflowEvidence:checked,
  sourceEvidenceOnly:true,
  liveDatabaseAttested:false,
  independentReleaseApprovalVerified:false,
  deploymentApproved:false,
  customerDataAccessEnabled:false,
  financialExecutionEnabled:false,
  productionRelease:"BLOCKED"
 });
}
