"use strict";
/** PAY54 Batch 27 / 1152 — exact GitHub Actions SHA status assessment. */
const SHA=/^[0-9a-f]{40}$/;
const deny=()=>{throw Error("PAY54_ACTIONS_RUN_STATUS_DENIED");};
export function inspectPay54ActionsExactHeadRuns({expectedSha,runs}={}){
 if(!SHA.test(expectedSha??"")||!Array.isArray(runs)||
    runs.length<1||runs.length>100)deny();
 const seen=new Set(),failed=[],unfinished=[],passed=[];
 for(const r of runs){
  if(!r||typeof r.name!=="string"||!r.name||
     !Number.isSafeInteger(r.id)||r.id<=0||seen.has(r.id)||
     r.head_sha!==expectedSha ||
     !["queued","pending","in_progress","completed"].includes(r.status) ||
     (r.status==="completed" && !["success","failure",
      "cancelled","timed_out","skipped","neutral",
      "action_required"].includes(r.conclusion)) ||
     (r.status!=="completed"&&r.conclusion!=null))deny();
  seen.add(r.id);
  if(r.conclusion==="success")passed.push(r.id);
  else if(r.status!=="completed")unfinished.push(r.id);
  else failed.push(r.id);
 }
 return Object.freeze({
  schema:"pay54.exact-head-actions-run-audit.v1",
  exactSourceSha:expectedSha,runCount:runs.length,
  successfulRunCount:passed.length,
  failedOrNonPassingRunIds:Object.freeze(failed),
  unfinishedRunIds:Object.freeze(unfinished),
  allReportedRunsPassed:failed.length===0&&unfinished.length===0,
  requiredWorkflowInventoryIndependentlyVerified:false,
  repoCommitProvenanceIndependentlyVerified:false,
  liveReleaseAuthorised:false
 });
}
