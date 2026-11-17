"use strict";

/**
 * PAY54 Batch 27 / 1103 — restricted read-only GitHub Pages collector.
 *
 * Operator provides a GitHub token from their protected environment. This
 * module never prints/stores it or follows redirects. It only queries fixed
 * GitHub REST endpoints and returns bounded, redacted metadata suitable for
 * separate independent review. No write permissions are ever requested.
 */
const API="https://api.github.com/repos/demiladeolawoye/PAY54_v8.0_SmartWallet";
const ENDPOINTS=Object.freeze({
 pages:"/pages",
 defaultBranchProtection:"/branches/project-titan/protection",
 environments:"/environments",
 rulesets:"/rulesets"
});
const deny=()=>{throw new Error("PAY54_GITHUB_READONLY_COLLECTION_DENIED");};
export async function collectPay54GithubReadOnlyEvidence({
 endpoint,token,fetchRequest=fetch,timeoutMs=5000
}={}){
 if(!Object.hasOwn(ENDPOINTS,endpoint) ||
    typeof token!=="string" ||
    !/^(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}$/.test(token) ||
    typeof fetchRequest!=="function" ||
    !Number.isInteger(timeoutMs) ||timeoutMs<1000 ||
    timeoutMs>10000)deny();

 let response;
 try{
  response=await fetchRequest(API+ENDPOINTS[endpoint],{
   method:"GET",redirect:"manual",cache:"no-store",
   headers:{
    authorization:"Bearer "+token,
    accept:"application/vnd.github+json",
    "x-github-api-version":"2022-11-28",
    "user-agent":"PAY54-EEO-ReadOnly-Evidence/1"
   },
   signal:AbortSignal.timeout(timeoutMs)
  });
 }catch{deny();}
 if(!response||typeof response.status!=="number" ||
    !Number.isInteger(response.status))deny();
 if(response.status!==200){
  return Object.freeze({
   schema:"pay54.github-readonly-observation.v1",
   endpoint,httpStatus:response.status,
   classification:"NOT_VERIFIED",
   response:null,
   permissionFailure:response.status===401||response.status===403,
   authenticatedReviewerIdentityVerified:false,
   sourceCommitVerified:false,releaseAuthorised:false
  });
 }
 if(!response.body||typeof response.body.getReader!=="function")deny();
 const reader=response.body.getReader();
 let bytes=0;
 const chunks=[];
 try{
  for(;;){
   const {done,value}=await reader.read();
   if(done)break;
   if(!(value instanceof Uint8Array))deny();
   bytes+=value.length;
   if(bytes>256*1024)deny();
   chunks.push(value);
  }
 }catch{try{await reader.cancel();}catch{}deny();}
 let parsed;
 try{
  const whole=Buffer.concat(chunks);
  const text=new TextDecoder("utf-8",{fatal:true}).decode(whole);
  parsed=JSON.parse(text);
 }catch{deny();}
 if(!parsed||typeof parsed!=="object")deny();
 let safe;
 if(endpoint==="pages"){
  safe={
   status:parsed.status,
   build_type:parsed.build_type,
   cname:parsed.cname??null,
   html_url:parsed.html_url,
   source:parsed.source
    ? {branch:parsed.source.branch,path:parsed.source.path}:null
  };
 }else if(endpoint==="defaultBranchProtection"){
  safe={
   required_pull_request_reviews:parsed.required_pull_request_reviews
    ? {required_approving_review_count:
       parsed.required_pull_request_reviews.required_approving_review_count,
       dismiss_stale_reviews:
       parsed.required_pull_request_reviews.dismiss_stale_reviews}:null,
   required_status_checks:parsed.required_status_checks
    ? {strict:parsed.required_status_checks.strict}:null,
   enforce_admins:parsed.enforce_admins
    ? {enabled:parsed.enforce_admins.enabled}:null,
   restrictions:parsed.restrictions
    ? {users:[],teams:[],apps:[]}:null
  };
 }else if(endpoint==="environments"){
  safe={total_count:parsed.total_count,
   names:Array.isArray(parsed.environments)
    ? parsed.environments.map(x=>x.name).filter(x=>
      typeof x==="string" && x.length<=128).slice(0,50):[]};
 }else{
  safe={rulesetCount:Array.isArray(parsed)?parsed.length:null};
 }
 return Object.freeze({
  schema:"pay54.github-readonly-observation.v1",
  endpoint,httpStatus:200,classification:"RESPONSE_OBSERVED",
  response:Object.freeze(safe),
  permissionFailure:false,
  authenticatedReviewerIdentityVerified:false,
  sourceCommitVerified:false,
  releaseAuthorised:false
 });
}
