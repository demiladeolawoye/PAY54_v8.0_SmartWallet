"use strict";
/**
 * PAY54 Batch27/1112 — bounded public GET for explicitly allowed STATIC
 * files only; never fetch backend, SQL, secrets or personal data.
 * Operator initiated, NEVER executed by CI or customer backend.
 * Returns only hash, status and size. Redirects forbidden.
 */
import {createHash} from "node:crypto";
const HOSTS=new Set(["getpay54.com","demiladeolawoye.github.io"]);
const SAFE=new Set(["index.html","dashboard.html",
 "assets/css/dashboard.css"]);
const deny=()=>{throw Error("PAY54_PUBLIC_STATIC_HASH_PROBE_DENIED");};
export async function probePay54PublicStaticHash({
 publicUrl,fetchPublic=fetch,timeoutMs=5000
}={}){
 if(typeof publicUrl!=="string"||typeof fetchPublic!=="function" ||
    !Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>10000)deny();
 let url;
 try{url=new URL(publicUrl);}catch{deny();}
 if(url.protocol!=="https:"||!HOSTS.has(url.hostname) ||
    url.port||url.username||url.password||url.hash||url.search)deny();
 const path=url.pathname.replace(/^\//,"");
 const normalized=path.startsWith("PAY54_v8.0_SmartWallet/")
  ?path.slice("PAY54_v8.0_SmartWallet/".length):path;
 if(!SAFE.has(normalized))deny();
 let response;
 try{
  response=await fetchPublic(url.href,{
   method:"GET",redirect:"manual",credentials:"omit",
   cache:"no-store",signal:AbortSignal.timeout(timeoutMs)
  });
 }catch{deny();}
 if(response?.status!==200 ||
    !response.body ||
    typeof response.body.getReader!=="function")deny();
 const reader=response.body.getReader();
 const hash=createHash("sha256");
 let length=0;
 try{
  for(;;){
   const item=await reader.read();
   if(item.done)break;
   if(!(item.value instanceof Uint8Array))deny();
   length+=item.value.length;
   if(length>4*1024*1024)deny();
   hash.update(item.value);
  }
 }catch{try{await reader.cancel();}catch{}deny();}
 if(length<10)deny();
 return Object.freeze({
  schema:"pay54.public-static-byte-hash-observation.v1",
  hostname:url.hostname,publicPath:normalized,
  observedContentBytes:length,sha256:hash.digest("hex"),
  observedFromInjectedHttpClient:true,
  originTlsAndDnsIndependentlyAttested:false,
  publicBackendSourceNotProbed:true,
  artifactReleaseAuthorised:false
 });
}
