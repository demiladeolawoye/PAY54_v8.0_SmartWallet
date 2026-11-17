"use strict";

/**
 * PAY54 Batch 28 / 1194 — bounded read-only PR stack collector.
 *
 * Restricted to one fixed PAY54 GitHub REST endpoint. No redirected
 * requests, credentials/cookies in output, write routes, auto-merge or
 * discussion of GitHub access tokens in reports.
 */
import {inspectPay54StackedDraftPullRequests}
 from "./pay54-stacked-pr-review.mjs";

const URL="https://api.github.com/repos/demiladeolawoye/PAY54_v8.0_SmartWallet/pulls?state=open&per_page=100";
const deny=()=>{throw Error("PAY54_STACKED_PR_COLLECTION_DENIED");};

export async function collectPay54StackedPrEvidence({
 accessToken,fetchRead=fetch,timeoutMs=8000,
 expectedEndNumber=16,
}={}){
 if(typeof accessToken!=="string" ||
    !/^(?:github_pat_|gh[pousr]_)[A-Za-z0-9_]{20,}$/.test(accessToken) ||
    typeof fetchRead!=="function" ||
    !Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>10000 ||
    !Number.isInteger(expectedEndNumber) ||
    expectedEndNumber<1||expectedEndNumber>100)deny();
 let response;
 try{
  response=await fetchRead(URL,{
   method:"GET",redirect:"manual",cache:"no-store",
   headers:{
    authorization:"Bearer "+accessToken,
    accept:"application/vnd.github+json",
    "x-github-api-version":"2022-11-28",
    "user-agent":"PAY54-EEO-Stacked-PR-ReadOnly/1"
   },
   signal:AbortSignal.timeout(timeoutMs)
  });
 }catch{deny();}
 if(response?.status!==200||!response.body ||
    typeof response.body.getReader!=="function")deny();
 const stream=response.body.getReader();
 let size=0;const chunks=[];
 try{
  for(;;){
   const part=await stream.read();
   if(part.done)break;
   if(!(part.value instanceof Uint8Array))deny();
   size+=part.value.byteLength;
   if(size>512*1024)deny();
   chunks.push(part.value);
  }
 }catch{try{await stream.cancel();}catch{}deny();}
 let parsed;
 try{parsed=JSON.parse(new TextDecoder("utf-8",{fatal:true})
  .decode(Buffer.concat(chunks)));}
 catch{deny();}
 if(!Array.isArray(parsed)||parsed.length===0 ||parsed.length>100)deny();
 const mapped=parsed.map(p=>{
  if(!p||typeof p!=="object")deny();
  return {
   number:p.number,
   state:p.state,
   draft:p.draft,
   merged:p.merged_at===null,
   headBranch:p.head?.ref,
   headSha:p.head?.sha,
   baseBranch:p.base?.ref
  };
 }).map(p=>({...p,merged:!p.merged}));
 // Reject incomplete result pagination rather than silently declaring safe.
 mapped.sort((a,b)=>a.number-b.number);
 const ours=mapped.filter(p=>p.number<=expectedEndNumber);
 if(ours.length!==expectedEndNumber ||
    ours[0].number!==1 ||
    ours.at(-1).number!==expectedEndNumber)deny();
 const result=inspectPay54StackedDraftPullRequests({
  pullRequests:ours,
  expectedFinalHead:ours.at(-1).headBranch
 });
 return Object.freeze({
  schema:"pay54.github-pr-stack-collection.v1",
  auditedPrCount:ours.length,
  sourceHeadSha:ours.at(-1).headSha,
  chainHasGaps:!result.hasContiguousBaseHeadSequence,
  unresolvedBaseHeadLinks:result.dependencyChainGaps,
  allDraftUnmerged:result.allPullRequestsStillUnmerged,
  apiIdentityIndependentlyReverified:false,
  permissionScopeAudited:false,
  mergeAuthorised:false,
  productionDeploymentAuthorised:false
 });
}
