"use strict";

/* Not an HTTP route. Builds a narrow, no-cache display response from an
 * already membership-authorised read result. Never accepts arbitrary rows.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXPECTED=["accountId","displayName","financialExecutionEnabled","type"];
export function createTenantDisplayResponse({accounts,financialExecutionEnabled}){
 if(!Array.isArray(accounts)||accounts.length>100||financialExecutionEnabled!==false){
  throw new Error("ACCOUNT_RESPONSE_UNAVAILABLE");
 }
 const seen=new Set(),output=[];
 for(const a of accounts){
  if(!a||typeof a!=="object"||Array.isArray(a)||
    Object.keys(a).sort().join(",")!==EXPECTED.join(",")||
    typeof a.accountId!=="string"||!UUID.test(a.accountId)||
    !["PERSONAL","BUSINESS"].includes(a.type)||
    typeof a.displayName!=="string"||a.displayName.length<1||a.displayName.length>120||
    a.financialExecutionEnabled!==false){
   throw new Error("ACCOUNT_RESPONSE_UNAVAILABLE");
  }
  const id=a.accountId.toLowerCase();
  if(seen.has(id))throw new Error("ACCOUNT_RESPONSE_UNAVAILABLE");
  seen.add(id);
  output.push(Object.freeze({accountId:id,type:a.type,displayName:a.displayName}));
 }
 const payload=JSON.stringify({accounts:output,financialExecutionEnabled:false});
 if(Buffer.byteLength(payload,"utf8")>16384)throw new Error("ACCOUNT_RESPONSE_UNAVAILABLE");
 return Object.freeze({
  status:200,
  headers:Object.freeze({
   "Content-Type":"application/json; charset=utf-8",
   "Cache-Control":"no-store, private",
   "Pragma":"no-cache",
   "Expires":"0",
   "Vary":"Cookie, Authorization",
   "Cross-Origin-Resource-Policy":"same-origin",
   "X-Content-Type-Options":"nosniff",
   "Referrer-Policy":"no-referrer",
   "Content-Security-Policy":"default-src 'none'; frame-ancestors 'none'"
  }),
  body:payload,financialExecutionEnabled:false
 });
}
