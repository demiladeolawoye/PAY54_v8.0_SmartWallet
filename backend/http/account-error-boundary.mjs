"use strict";

/* Generic, no-store account errors. Never include customer identity, SQL,
 * access token, account name or dependency messages in HTTP response.
 */
const PUBLIC_CODES=Object.freeze({
  AUTH_REQUIRED:401,ACCESS_DENIED:404,BAD_REQUEST:400,RATE_LIMITED:429,
  UNAVAILABLE:503
});
export function projectAccountError({code}={}){
 if(typeof code!=="string"||!Object.hasOwn(PUBLIC_CODES,code)){
  throw new Error("ACCOUNT_ERROR_CLASS_INVALID");
 }
 const status=PUBLIC_CODES[code];
 return Object.freeze({status,headers:Object.freeze({
  "Content-Type":"application/json; charset=utf-8",
  "Cache-Control":"no-store, private",
  "Pragma":"no-cache",
  "Cross-Origin-Resource-Policy":"same-origin",
  "X-Content-Type-Options":"nosniff"
 }),body:JSON.stringify({error:"ACCOUNT_REQUEST_UNAVAILABLE"}),
 financialExecutionEnabled:false});
}
