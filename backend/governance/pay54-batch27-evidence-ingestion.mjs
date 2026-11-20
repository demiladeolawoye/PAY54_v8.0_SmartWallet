"use strict";
/**
 * PAY54 Batch 27 / 1083 — operator-collected, untrusted evidence ingestion.
 *
 * Read local JSON only after independent operator obtains it; no API tokens,
 * GitHub network calls, cloud access, Pages mutation or request logging.
 * Bound size and strict parser prevent excessive/ambiguous evidence input.
 */
import {readFileSync,lstatSync} from "node:fs";
import {resolve} from "node:path";
const deny=()=>{throw new Error("PAY54_EVIDENCE_INGESTION_DENIED");};
const forbidden=new Set(["__proto__","prototype","constructor"]);
export function parsePay54UntrustedEvidenceBytes({
 bytes,maxBytes=256*1024
}={}){
 if(!Buffer.isBuffer(bytes)||!Number.isSafeInteger(maxBytes)||
    maxBytes<1024||maxBytes>1024*1024||
    bytes.length<2||bytes.length>maxBytes)deny();
 const decoded=bytes.toString("utf8");
 if(Buffer.from(decoded,"utf8").compare(bytes)!==0)deny();
 let value;
 try{value=JSON.parse(decoded,(k,v)=>{
  if(forbidden.has(k))deny();
  return v;
 });}catch{deny();}
 if(!value||Array.isArray(value)||typeof value!=="object"||
    Object.getPrototypeOf(value)!==Object.prototype)deny();
 if(Object.keys(value).length>32)deny();
 return Object.freeze({
  schema:"pay54.untrusted-evidence-input.v1",
  parsed:value,
  contentsIndependentlyAuthenticated:false,
  releaseAuthorised:false
 });
}
export function loadPay54OperatorEvidenceFile({filename}={}){
 if(typeof filename!=="string"||!filename.trim())deny();
 const path=resolve(filename);
 let stat,bytes;
 try{stat=lstatSync(path);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||
     stat.size<2||stat.size>256*1024)deny();
  bytes=readFileSync(path);
 }catch{deny();}
 return parsePay54UntrustedEvidenceBytes({bytes});
}
