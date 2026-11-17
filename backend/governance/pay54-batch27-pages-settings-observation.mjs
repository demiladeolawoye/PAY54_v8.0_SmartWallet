"use strict";

/**
 * PAY54 Batch 27 / 1068 — GitHub Pages settings evidence normalizer.
 * Accepts narrowly scoped authenticated GitHub REST response metadata.
 * Does NOT authenticate the caller, invoke GitHub, reveal API credentials,
 * mutate Pages settings, infer missing permissions or grant a deployment.
 */
const deny=()=>{throw new Error("PAY54_PAGES_SETTINGS_EVIDENCE_DENIED");};
const REPO="demiladeolawoye/PAY54_v8.0_SmartWallet";
const STATUS=new Set(["built","building","errored"]);
const BUILD=new Set(["workflow","legacy"]);
const BRANCH=new Set(["project-titan","gh-pages"]);
const PATH=new Set(["/","/docs"]);
const DOMAIN=new Set(["getpay54.com","www.getpay54.com",null]);
const HOST=new Set(["getpay54.com","www.getpay54.com",
  "demiladeolawoye.github.io"]);
export function normalisePay54PagesSettingsEvidence({
 repositoryFullName,apiStatus,authenticatedReviewerId,
 observedAtMs,response
}={}){
 if(repositoryFullName!==REPO || apiStatus!==200 ||
    !/^[a-zA-Z0-9-]{1,39}$/.test(authenticatedReviewerId??"") ||
    !Number.isSafeInteger(observedAtMs)||observedAtMs<=0 ||
    !response || typeof response!=="object" ||Array.isArray(response) ||
    !STATUS.has(response.status) || !BUILD.has(response.build_type) ||
    !DOMAIN.has(response.cname??null) ||
    typeof response.html_url!=="string")deny();
 let url;
 try{url=new URL(response.html_url);}catch{deny();}
 if(url.protocol!=="https:" || !HOST.has(url.hostname) ||
    url.username||url.password||url.search||url.hash)deny();
 const source=response.source;
 if(response.build_type==="legacy" &&
    (!source || !BRANCH.has(source.branch) || !PATH.has(source.path)))deny();
 if(response.build_type==="workflow" && source!=null &&
   (!BRANCH.has(source.branch)||!PATH.has(source.path)))deny();
 const rootRisk=response.build_type==="legacy" &&
   source?.path==="/" && source?.branch==="project-titan";
 return Object.freeze({
  schema:"pay54.pages-settings-api-observation.v1",
  repositoryFullName,reviewerId:authenticatedReviewerId,
  observedAtMs,siteStatus:response.status,
  buildType:response.build_type,
  sourceBranch:source?.branch??null,
  sourceDirectory:source?.path??null,
  customDomain:response.cname??null,
  sourceRootRisk:rootRisk,
  responseCallerAuthenticationIndependentlyVerified:false,
  authenticatedGitHubApiOwnershipIndependentlyVerified:false,
  deployedArtifactContentsVerified:false,
  securityIncidentClosed:false,
  productionDeploymentAuthorised:false
 });
}
