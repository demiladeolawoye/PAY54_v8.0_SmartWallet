"use strict";

/**
 * PAY54 implementation 392: opt-in, read-only GitHub Pages exposure probe.
 *
 * No network request occurs on import. A caller must explicitly supply the
 * Pages base URL and a predetermined set of relative paths. Only HEAD requests
 * to the expected github.io origin are permitted, redirects are not followed,
 * and response bodies are never retrieved or logged.
 */
const MAX_PROBES=20;
const MAX_PATH=256;
const TIMEOUT_MS=6500;

export async function probePay54PagesPaths({
 baseUrl,paths,head=globalThis.fetch
}={}){
 if(typeof baseUrl!=="string")throw new TypeError("PAY54_PAGES_BASE_REQUIRED");
 let base;
 try{base=new URL(baseUrl);}catch{throw new Error("PAY54_PAGES_BASE_INVALID");}
 if(base.protocol!=="https:"||
  base.hostname!=="demiladeolawoye.github.io"||
  base.username||base.password||base.search||base.hash||
  base.pathname!=="/PAY54_v8.0_SmartWallet/"){
  throw new Error("PAY54_PAGES_ORIGIN_DENIED");
 }
 if(!Array.isArray(paths)||paths.length<1||paths.length>MAX_PROBES){
  throw new Error("PAY54_PAGES_PROBE_LIST_DENIED");
 }
 if(typeof head!=="function")throw new TypeError("PAY54_PAGES_HEAD_REQUIRED");
 const results=[];
 const unique=new Set();
 for(const path of paths){
  if(typeof path!=="string"||!path||path.length>MAX_PATH||
   path.startsWith("/")||path.includes("\\")||path.includes("?")||
   path.includes("#")||/%[a-f0-9]{2}/i.test(path)||
   path.split("/").some(x=>!x||x==="."||x==="..")||
   !/^[a-zA-Z0-9._/-]+$/.test(path)||unique.has(path)){
   throw new Error("PAY54_PAGES_PROBE_PATH_DENIED");
  }
  unique.add(path);
 }
 for(const path of unique){
  const target=new URL(path,base);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
  try{
   const response=await head(target.toString(),{
    method:"HEAD",redirect:"manual",signal:controller.signal,
    credentials:"omit",cache:"no-store",headers:{"Accept":"*/*"}
   });
   const status=Number(response?.status);
   const classification=status>=200&&status<300?"HTTP_SUCCESS_UNVERIFIED_BODY":
    status===404?"HTTP_404":status===403?"HTTP_403":
    status>=300&&status<400?"REDIRECT_NOT_FOLLOWED":"INDETERMINATE";
   results.push(Object.freeze({path,httpStatus:Number.isInteger(status)?status:null,classification}));
  }catch{
   results.push(Object.freeze({path,httpStatus:null,classification:"REQUEST_FAILED"}));
  }finally{clearTimeout(timer);}
 }
 return Object.freeze({
  schema:"pay54.pages-headers-only-evidence.v1",
  siteOrigin:base.origin,
  results:Object.freeze(results),
  bodyDownloaded:false,
  actualFileContentVerified:false,
  secretsExposureConfirmed:false,
  pagesSourceSettingsVerified:false,
  productionRelease:"BLOCKED"
 });
}
