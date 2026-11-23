"use strict";

/**
 * PAY54 Batch32 — unmounted authenticated wallet-read HTTP boundary.
 * Route implementation deliberately has NO listener, no DB role, no secrets
 * and no runtime production authority. Inject a trusted authenticated service.
 */
const DENIED="PAY54_WALLET_HTTP_ADMISSION_DENIED";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PATH=/^\/v1\/accounts\/([0-9a-f-]{36})\/wallet\/balance$/i;
const B64=/^Bearer [A-Za-z0-9_-]{32,2048}$/;
const SENSITIVE=new Set(["authorization","cookie","origin","host",
 "content-length","transfer-encoding","content-type",
 "x-forwarded-host","x-forwarded-proto","sec-fetch-site"]);
const deny=()=>{throw Error(DENIED);};

export function createPay54WalletBalanceHttpHandler({
 authenticatedService,trustedOrigin
}={}){
 if(typeof authenticatedService?.read!=="function"||
    typeof trustedOrigin!=="string"||
    !/^https:\/\/[^\s/?#]+$/.test(trustedOrigin))deny();
 return async function handle(request,response){
  if(!request||!response||response.headersSent)deny();
  const fail=(status=403)=>{
   response.writeHead(status,{"Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store","X-Content-Type-Options":"nosniff",
    "Referrer-Policy":"no-referrer","Vary":"Origin"});
   response.end('{"error":"wallet_read_unavailable"}');
  };
  try{
   const path=(request.url??"").match(PATH);
   if(request.method!=="GET"||!path||!UUID.test(path[1])||
      !request.headers||typeof request.headers.authorization!=="string"||
      !B64.test(request.headers.authorization)||
      request.headers.origin!==trustedOrigin||
      request.headers.host!==new URL(trustedOrigin).host||
      !["same-origin","none"].includes(request.headers["sec-fetch-site"])||
      request.headers.cookie!==undefined||
      request.headers["content-length"]!==undefined||
      request.headers["transfer-encoding"]!==undefined||
      request.headers["content-type"]!==undefined||
      request.headers["x-forwarded-host"]!==undefined||
      request.headers["x-forwarded-proto"]!==undefined||
      !Array.isArray(request.rawHeaders)||
      request.rawHeaders.length%2!==0)deny();

   const seen=new Set();
   for(let i=0;i<request.rawHeaders.length;i+=2){
    const k=request.rawHeaders[i]?.toLowerCase();
    if(typeof k!=="string"||(SENSITIVE.has(k)&&seen.has(k)))deny();
    seen.add(k);
   }
   if(!["authorization","host","origin","sec-fetch-site"]
     .every(k=>seen.has(k)))deny();
   // No query parameters or URL-controlled metadata. Only the trusted
   // backend service can authenticate the credential and account membership.
   const result=await authenticatedService.read({
    request,requestedAccountId:path[1].toLowerCase()
   });
   if(result?.schema!=="pay54.account-wallet-balance-read.v1"||
      result.accountId!==path[1].toLowerCase()||
      result.displayOnly!==true||result.financialExecutionAuthorised!==false||
      result.productionReady!==false)deny();
   const body=JSON.stringify(result);
   if(body.length>2048)deny();
   response.writeHead(200,{"Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store","X-Content-Type-Options":"nosniff",
    "Referrer-Policy":"no-referrer","Vary":"Origin"});
   response.end(body);
  }catch{if(!response.headersSent)fail();}
 };
}
