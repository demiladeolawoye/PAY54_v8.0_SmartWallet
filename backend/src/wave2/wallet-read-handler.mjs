"use strict";
/**
 * PAY54 Wave3: deliberately unmounted read-only HTTP boundary.
 * Host must provide authenticated caller-role PostgreSQL reader and an
 * independently secured router with TLS, rate limits and CSRF policy.
 */
const deny=()=>Object.freeze({
 statusCode:404,
 headers:Object.freeze({"cache-control":"no-store","content-type":"application/json"}),
 body:JSON.stringify({error:"WALLET_NOT_AVAILABLE"})
});
export function createPay54WalletReadHandler({reader}={}){
 if(!reader||typeof reader.read!=="function")
  throw new TypeError("PAY54_W3_READER_REQUIRED");
 return async function pay54ReadOnlyWallet(request){
  if(!request||request.method!=="GET"||
     request.path!=="/v1/wallets/read"||
     typeof request.headers?.authorization!=="string"||
     !request.query||typeof request.query!=="object")return deny();
  try{
   const data=await reader.read({
    request,accountId:request.query.accountId,
    walletId:request.query.walletId,currency:request.query.currency
   });
   if(data?.schema!=="pay54.wave2.wallet-read-model.v1"||
      data.financialExecutionEnabled!==false||
      data.presentationOnly!==true)return deny();
   return Object.freeze({
    statusCode:200,
    headers:Object.freeze({"cache-control":"no-store","content-type":"application/json"}),
    body:JSON.stringify(data)
   });
  }catch{return deny();}
 };
}
