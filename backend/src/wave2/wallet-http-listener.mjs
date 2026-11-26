"use strict";
import {createPay54WalletReadHandler} from "./wallet-read-handler.mjs";

/**
 * PAY54 Wave 4 — securely bounded Node HTTP adapter.
 *
 * No server is created or started here. Explicit host-router mounting is a
 * separate, security-reviewed decision. This adapter never supports writes.
 */
const QUERY_KEYS=new Set(["accountId","walletId","currency"]);
const MAX_TARGET_LENGTH=300;
const RESPONSE_HEADERS=Object.freeze({
 "content-type":"application/json; charset=utf-8",
 "cache-control":"private, no-store, max-age=0",
 "pragma":"no-cache",
 "x-content-type-options":"nosniff",
 "referrer-policy":"no-referrer",
 "content-security-policy":"default-src 'none'",
 "vary":"Authorization"
});
const ERROR=JSON.stringify({error:"WALLET_NOT_AVAILABLE"});

export function createPay54WalletHttpListener({reader}={}){
 const handler=createPay54WalletReadHandler({reader});
 return async function pay54WalletHttpListener(req,res){
  if(!res||typeof res.writeHead!=="function"||typeof res.end!=="function")
   throw new TypeError("PAY54_W4_HTTP_RESPONSE_REQUIRED");
  let status=404,body=ERROR;
  try{
   if(req?.method==="GET" &&
      typeof req.url==="string" && req.url.length<=MAX_TARGET_LENGTH &&
      req.url.startsWith("/") && !req.url.startsWith("//") &&
      typeof req.headers?.authorization==="string" &&
      req.headers.authorization.length===50){
    const url=new URL(req.url,"http://pay54.invalid");
    if(url.pathname==="/v1/wallets/read" &&
       [...url.searchParams.keys()].every(k=>QUERY_KEYS.has(k)) &&
       url.searchParams.size===3 &&
       [...QUERY_KEYS].every(k=>url.searchParams.getAll(k).length===1)){
      const result=await handler({
       method:"GET",path:url.pathname,
       headers:{authorization:req.headers.authorization},
       query:Object.fromEntries(url.searchParams.entries())
      });
      if(result.statusCode===200 &&
         typeof result.body==="string" &&
         result.body.length<=8192){
       const parsed=JSON.parse(result.body);
       if(parsed?.schema==="pay54.wave2.wallet-read-model.v1" &&
          parsed.presentationOnly===true &&
          parsed.financialExecutionEnabled===false &&
          Array.isArray(parsed.wallets) && parsed.wallets.length<=12 &&
          parsed.wallets.every(w=>w.canInitiateTransfer===false)){
        status=200;body=result.body;
       }
      }
    }
   }
  }catch{status=404;body=ERROR;}
  // No transfer routes, cookie issuance, user-supplied CORS or credential logs.
  res.writeHead(status,RESPONSE_HEADERS);
  res.end(body);
 };
}
