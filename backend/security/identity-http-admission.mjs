"use strict";

/**
 * PAY54 Batch 24 / 942 — bounded future HTTP ingress for bootstrap requests.
 *
 * Does not mount a route. Validates raw HTTP framing, rejects ambiguous
 * duplicated headers, cookies and transfer-encoding, reads at most 12 KiB,
 * and admits only exactly one unescaped signed access assertion.
 * Existing foundation /v1/* remains 503 until independently approved.
 */
import { TextDecoder } from "node:util";
import { parsePay54SessionIssuanceRequest }
 from "./identity-ingress.mjs";

const MAX=12*1024;
const BODY=/^\s*\{\s*"accessAssertion"\s*:\s*"([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)"\s*\}\s*$/;
const deny=()=>{throw new Error("PAY54_BOOTSTRAP_HTTP_ADMISSION_DENIED");};
const sensitive=new Set([
 "content-length","content-type","origin","authorization",
 "host","transfer-encoding","cookie","x-forwarded-host","x-forwarded-proto"
]);
export async function readPay54BootstrapHttpRequest({
 request,trustedApplicationOrigin
}={}){
 if(!request || request.method!=="POST" ||
    request.url!=="/v1/auth/bootstrap" ||
    !request.headers ||
    request.headers["content-type"]!=="application/json" ||
    request.headers.origin!==trustedApplicationOrigin ||
    request.headers.authorization!==undefined ||
    request.headers.cookie!==undefined ||
    request.headers["transfer-encoding"]!==undefined ||
    request.headers["x-forwarded-host"]!==undefined ||
    request.headers["x-forwarded-proto"]!==undefined ||
    typeof request[Symbol.asyncIterator]!=="function")deny();

 const lengthHeader=request.headers["content-length"];
 if(typeof lengthHeader!=="string" || !/^[1-9][0-9]{0,4}$/.test(lengthHeader))deny();
 const expected=Number(lengthHeader);
 if(expected>MAX)deny();

 if(!Array.isArray(request.rawHeaders) ||
    request.rawHeaders.length%2!==0)deny();
 const seen=new Set();
 for(let i=0;i<request.rawHeaders.length;i+=2){
  const name=request.rawHeaders[i]?.toLowerCase();
  if(typeof name!=="string")deny();
  if(sensitive.has(name)){
   if(seen.has(name))deny();
   seen.add(name);
  }
 }
 for(const required of ["content-length","content-type","origin"])
  if(!seen.has(required))deny();

 let received=0;
 const chunks=[];
 try{
  for await(const chunk of request){
   if(!Buffer.isBuffer(chunk))deny();
   received+=chunk.length;
   if(received>MAX || received>expected)deny();
   chunks.push(chunk);
  }
 }catch{deny();}
 if(received!==expected)deny();

 let decoded;
 try{decoded=new TextDecoder("utf-8",{fatal:true})
    .decode(Buffer.concat(chunks));}catch{deny();}
 const match=decoded.match(BODY);
 if(!match)deny();
 try{
  return parsePay54SessionIssuanceRequest({
   requestPayload:{accessAssertion:match[1]},
   requestOrigin:request.headers.origin,
   trustedApplicationOrigin
  });
 }catch{deny();}
}
