"use strict";
import {readFileSync, mkdtempSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {spawnSync} from "node:child_process";
const SHA=/^[a-f0-9]{40}$/;
const BRANCH=/^[a-zA-Z0-9][a-zA-Z0-9/_-]*$/;
const EXPECTED=[81,82,83,84,85,86,87,88,89];
const GATES=["sourceMergeApproved","cloudSpendingAuthorized",
 "managedStagingAuthorized","productionAuthorized",
 "realMoneyExecutionAuthorized","positiveFinancialWriterProven",
 "realCombinedPostgresSuiteProven"];
export function validateManifest(value){
 if(!value||typeof value!=="object"||Array.isArray(value)||
 value.schema!=="pay54.batch50.integration-manifest.v1"||
 value.baseline?.branch!=="project-titan"||
 !SHA.test(value.baseline?.sha??"")||
 !Array.isArray(value.pullRequests)||
 value.pullRequests.length!==EXPECTED.length||
 !value.releaseGates||GATES.some(k=>value.releaseGates[k]!==false))
  throw Error("PAY54_BATCH50_INVALID_OR_UNSAFE_MANIFEST");
 const seen=new Set();
 for(const [i,p] of value.pullRequests.entries()){
  if(!p||p.number!==EXPECTED[i]||typeof p.branch!=="string"||
     !BRANCH.test(p.branch)||!p.branch.startsWith("cto/batch")||
     seen.has(p.branch)||!SHA.test(p.sha??""))
   throw Error("PAY54_BATCH50_PR_IDENTITY_INVALID");
  seen.add(p.branch);
 }
 return value;
}
function git(cwd,args,allowFailure=false){
 const r=spawnSync("git",["-C",cwd,...args],{
  encoding:"utf8",timeout:120000,maxBuffer:4194304
 });
 if(r.error)throw Error("PAY54_BATCH50_GIT_ERROR:"+r.error.message);
 if(r.status!==0&&!allowFailure)
  throw Error("PAY54_BATCH50_GIT_FAILURE:"+args[0]+":"+r.stderr.slice(0,1000));
 return r;
}
export function inspectGitWorkspace({repositoryPath,manifest}){
 validateManifest(manifest);
 const root=resolve(repositoryPath);
 const workspace=mkdtempSync(join(tmpdir(),"pay54-batch50-"));
 const worktree=join(workspace,"integration");
 let added=false;
 const report={
  schema:"pay54.batch50.integration-audit.v1",sourceOnly:true,
  allHeadShasVerified:false,combinedMergeClean:false,
  combinedNodeTestsExecuted:false,combinedPostgresTestsExecuted:false,
  overlappingFiles:[],conflicts:[],mergedPullRequests:[],blockers:[],
  cloudSpendingAuthorized:false,sourceMergeAuthorized:false,
  managedStagingAuthorized:false,productionAuthorized:false,
  financialExecutionAuthorized:false
 };
 try{
  const b=git(root,["rev-parse","--verify","refs/remotes/origin/"+manifest.baseline.branch],true);
  if(b.status!==0||b.stdout.trim()!==manifest.baseline.sha){
   report.blockers.push("BASELINE_MOVED_OR_UNAVAILABLE");return report;
  }
  for(const p of manifest.pullRequests){
   const r=git(root,["rev-parse","--verify","refs/remotes/origin/"+p.branch],true);
   if(r.status!==0||r.stdout.trim()!==p.sha)
    report.blockers.push("PR_"+p.number+"_HEAD_MISMATCH_OR_UNAVAILABLE");
  }
  if(report.blockers.length)return report;
  report.allHeadShasVerified=true;
  const owners=new Map();
  for(const p of manifest.pullRequests){
   const diff=git(root,["diff","--name-only",manifest.baseline.sha,p.sha]);
   for(const path of diff.stdout.split("\n").filter(Boolean)){
    if(!owners.has(path))owners.set(path,[]);
    owners.get(path).push(p.number);
   }
  }
  report.overlappingFiles=[...owners.entries()].filter(x=>x[1].length>1)
   .map(([path,pullRequests])=>({path,pullRequests}))
   .sort((a,b)=>a.path.localeCompare(b.path));
  git(root,["worktree","add","--detach",worktree,manifest.baseline.sha]);added=true;
  git(worktree,["config","user.name","PAY54 Disposable Integration Audit"]);
  git(worktree,["config","user.email","pay54-audit@invalid.example"]);
  for(const p of manifest.pullRequests){
   const merged=git(worktree,["merge","--no-ff","--no-edit","--no-gpg-sign",p.sha],true);
   if(merged.status!==0){
    const unmerged=git(worktree,["diff","--name-only","--diff-filter=U"],true);
    report.conflicts.push({pullRequest:p.number,paths:unmerged.stdout.split("\n").filter(Boolean)});
    report.blockers.push("PR_"+p.number+"_COMBINED_MERGE_FAILED");
    break;
   }
   report.mergedPullRequests.push(p.number);
  }
  report.combinedMergeClean=report.mergedPullRequests.length===manifest.pullRequests.length;
  if(!report.combinedMergeClean)report.blockers.push("COMBINED_REGRESSION_NOT_EXECUTED");
  else report.blockers.push("COMBINED_POSTGRES_REGRESSION_NOT_EXECUTED");
  return report;
 }finally{
  if(added){
   git(root,["worktree","remove","--force",worktree],true);
   git(root,["worktree","prune"],true);
  }
  rmSync(workspace,{recursive:true,force:true});
 }
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
 try{
  const path=process.argv[2]??"backend/governance/pay54-batch50-manifest.json";
  const manifest=validateManifest(JSON.parse(readFileSync(path,"utf8")));
  const report=inspectGitWorkspace({repositoryPath:process.cwd(),manifest});
  const output=JSON.stringify(report,null,2)+"\n";
  if(process.argv[3])writeFileSync(process.argv[3],output);
  process.stdout.write(output);
 }catch(e){process.stderr.write("PAY54_BATCH50_AUDIT_ERROR:"+e.message+"\n");process.exitCode=1;}
}
