"use strict";

/**
 * PAY54 Batch 25 / 975 — conservative PUBLIC Pages exposure probe.
 *
 * Operator-initiated HEAD only. No cookies, authentication, tokens, secret
 * values, response bodies, redirects, or deployment. This is a point-in-time
 * signal, not a comprehensive forensic incident assessment. The GitHub Pages
 * publication settings and artifact identity still require independent proof.
 */
const TARGETS=Object.freeze([
 "https://getpay54.com/",
 "https://demiladeolawoye.github.io/PAY54_v8.0_SmartWallet/"
]);
const PRIVATE=Object.freeze([
 "backend/src/server.mjs",
 "backend/db/migrations/020_initial_account_binding.sql",
 "docs/engineering/pay54-batch24-founder-register.md",
 "infrastructure/staging/main.tf",
 ".github/workflows/pay54-staging-deploy.yml"
]);
const deny=()=>{throw new Error("PAY54_REMOTE_PAGES_PROBE_DENIED");};

export async function probePay54KnownPublicPages({
 fetchHead=fetch,
 requestedAtMs=Date.now(),
 baseUrls=TARGETS
}={}){
 if(typeof fetchHead!=="function" ||
    !Number.isSafeInteger(requestedAtMs) || requestedAtMs<=0 ||
    !Array.isArray(baseUrls) || !baseUrls.length ||
    baseUrls.length>TARGETS.length ||
    baseUrls.some(url=>!TARGETS.includes(url)) ||
    new Set(baseUrls).size!==baseUrls.length)deny();

 const observations=[];
 for(const base of baseUrls){
  for(const path of PRIVATE){
   let response;
   const url=new URL(path,base).href;
   try{
    response=await fetchHead(url,{
     method:"HEAD",redirect:"manual",
     credentials:"omit",cache:"no-store",
     signal:AbortSignal.timeout(5000)
    });
   }catch{
    observations.push(Object.freeze({
     baseUrl:base,path,classification:"NOT_VERIFIED",
     statusCode:null
    }));
    continue;
   }
   const status=response?.status;
   if(!Number.isInteger(status) || status<100 || status>599)deny();
   const classification=
    status>=200&&status<300 ? "POTENTIAL_PUBLIC_SOURCE_EXPOSURE"
    :status===404||status===410 ? "NOT_FOUND_AT_PROBE_TIME"
    :"NOT_VERIFIED";
   observations.push(Object.freeze({
    baseUrl:base,path,classification,statusCode:status
   }));
  }
 }
 const potential=observations.filter(x=>
  x.classification==="POTENTIAL_PUBLIC_SOURCE_EXPOSURE");
 const uncertain=observations.filter(x=>
  x.classification==="NOT_VERIFIED");
 return Object.freeze({
  schema:"pay54.public-pages-head-probe.v1",
  collectedAtMs:requestedAtMs,
  attemptedRequests:observations.length,
  potentialExposureCount:potential.length,
  unverifiableCount:uncertain.length,
  observations:Object.freeze(observations),
  noPublicExposureProven:false,
  currentDeployedArtifactHashVerified:false,
  pagesConfigurationIndependentlyVerified:false,
  productionOrSiteDeploymentAuthorised:false
 });
}
