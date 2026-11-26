"use strict";
import {readFileSync,writeFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {resolve} from "node:path";
const SHA=/^[0-9a-f]{40}$/;
const SAFE_BRANCH=/^cto\/[a-z0-9][a-z0-9-]*$/;
const FIELDS=["sourceMergeApproved","cloudSpendApproved","managedStagingApproved","productionApproved","realMoneyApproved","canonicalWriterPositiveProven"];
const PRS=[92,93,94,95,96,97];
export function validateWave1Manifest(m){
 if(!m||typeof m!=="object"||Array.isArray(m)||
  m.schema!=="pay54.acceleration.wave1.v1"||
  m.protectedTarget!=="project-titan"||!SHA.test(m.protectedBase??"")||
  !Array.isArray(m.stack)||m.stack.length!==PRS.length)
  throw Error("PAY54_WAVE1_INVALID_MANIFEST");
 if(!m.release||FIELDS.some(k=>m.release[k]!==false)||
  m.approvals?.sourceMergeAuthorization!==false||
  m.approvals?.productionReleaseAuthorization!==false||
  m.approvals?.pr97IndependentApprovalVerified!==false)
  throw Error("PAY54_WAVE1_RELEASE_GATE_MUST_REMAIN_CLOSED");
 const branches=new Set();
 for(const [i,entry] of m.stack.entries()){
  if(!entry||entry.pr!==PRS[i]||!SHA.test(entry.sha??"")||
    !SAFE_BRANCH.test(entry.branch??"")||branches.has(entry.branch))
    throw Error("PAY54_WAVE1_STACK_IDENTITY_INVALID");
  branches.add(entry.branch);
 }
 if(!Array.isArray(m.parallelStreams)||m.parallelStreams.length!==6||
    new Set(m.parallelStreams.map(s=>s.id)).size!==6||
    m.parallelStreams.some(s=>!s.owner||!s.scope||!Array.isArray(s.dependsOn)))
    throw Error("PAY54_WAVE1_STREAM_ASSIGNMENT_INVALID");
 return m;
}
function git(args){
 const r=spawnSync("git",args,{encoding:"utf8",timeout:30000,maxBuffer:2000000});
 return {success:r.status===0,stdout:r.stdout?.trim()??"",stderr:r.stderr?.trim()??""};
}
export function auditWave1(m,runner=git){
 validateWave1Manifest(m);
 const blockers=[];
 const evidence=[];
 const base=runner(["rev-parse","--verify","refs/remotes/origin/project-titan"]);
 if(!base.success||base.stdout!==m.protectedBase)blockers.push("PROTECTED_BASE_DRIFT");
 let parent=m.protectedBase;
 for(const entry of m.stack){
  const head=runner(["rev-parse","--verify","refs/remotes/origin/"+entry.branch]);
  const shaMatch=head.success&&head.stdout===entry.sha;
  const ancestry=runner(["merge-base","--is-ancestor",parent,entry.sha]).success;
  evidence.push({pr:entry.pr,exactHead:shaMatch,descendsFromPrevious:ancestry});
  if(!shaMatch)blockers.push("PR_"+entry.pr+"_HEAD_DRIFT");
  if(!ancestry)blockers.push("PR_"+entry.pr+"_ANCESTRY_MISMATCH");
  parent=entry.sha;
 }
 const current=runner(["rev-parse","HEAD"]);
 const containsStack=current.success&&runner(["merge-base","--is-ancestor",parent,current.stdout]).success;
 if(!containsStack)blockers.push("CI_CHECKOUT_NOT_DESCENDED_FROM_APPROVED_STACK");
 return {
  schema:"pay54.acceleration.wave1.audit.v1",
  sourceIntegrityValid:blockers.length===0,
  blockers,evidence,
  independentReviewVerified:false,
  integrationReleaseApproved:false,
  canonicalPositiveWriterProven:false,
  customerMoneyEnabled:false,
  cloudSpendApproved:false,
  stagingApproved:false,
  productionApproved:false
 };
}
const invoked=process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname);
if(invoked){
 try{
  const m=JSON.parse(readFileSync(process.argv[2]??"backend/governance/pay54-acceleration-wave1.json","utf8"));
  const report=auditWave1(m);
  if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(report,null,2)+"\n");
  process.stdout.write(JSON.stringify(report,null,2)+"\n");
  if(!report.sourceIntegrityValid)process.exitCode=1;
 }catch(e){process.stderr.write("PAY54_WAVE1_AUDIT_FAILED:"+e.message+"\n");process.exitCode=1;}
}
