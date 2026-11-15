"use strict";
/* Standalone, unmounted account-response envelope. Never stringify raw DB rows. */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function projectAuthenticatedAccountResponse({accounts,verifiedPrincipalId}){
 if(typeof verifiedPrincipalId!=="string"||!UUID.test(verifiedPrincipalId)||
    !Array.isArray(accounts)||accounts.length>100)throw new Error("ACCOUNT_RESPONSE_DENIED");
 const ids=new Set(),rows=[];
 for(const a of accounts){
  if(!a||typeof a!=="object"||typeof a.accountId!=="string"||
     !UUID.test(a.accountId)||!["PERSONAL","BUSINESS"].includes(a.type)||
     typeof a.displayName!=="string"||a.displayName.length<1||a.displayName.length>120){
    throw new Error("ACCOUNT_RESPONSE_DENIED");
  }
  const id=a.accountId.toLowerCase();
  if(ids.has(id))throw new Error("ACCOUNT_RESPONSE_DENIED");
  ids.add(id);
  rows.push(Object.freeze({accountId:id,type:a.type,displayName:a.displayName}));
 }
 return Object.freeze({accounts:Object.freeze(rows),
  sensitiveDataIncluded:false,financialExecutionEnabled:false});
}
