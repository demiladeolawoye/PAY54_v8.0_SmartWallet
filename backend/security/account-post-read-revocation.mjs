"use strict";
import {requireAccountDbPrincipal} from "./account-db-principal.mjs";

/* A second authoritative revocation check before releasing account labels.
 * This is still preview-only and cannot authorise a monetary transaction.
 */
export function createPostReadRevocation({checkAuthoritative,now=()=>Date.now(),
 maxLatencyMs=1500}={}){
 if(typeof checkAuthoritative!=="function"||typeof now!=="function"||
    !Number.isSafeInteger(maxLatencyMs)||maxLatencyMs<100||maxLatencyMs>5000){
  throw new TypeError("ACCOUNT_REVALIDATION_CONFIG_INVALID");
 }
 return Object.freeze({
  async verify({dbPrincipal,readResult}){
   const actor=requireAccountDbPrincipal(dbPrincipal);
   if(!readResult||typeof readResult!=="object"||
      readResult.financialExecutionEnabled!==false){
    throw new Error("ACCOUNT_READ_REVOKED");
   }
   const began=now();
   if(!Number.isSafeInteger(began))throw new Error("ACCOUNT_REVOCATION_UNAVAILABLE");
   let revoked;
   try{revoked=await checkAuthoritative({principalId:actor.principalId});}
   catch{throw new Error("ACCOUNT_REVOCATION_UNAVAILABLE");}
   const finished=now();
   if(!Number.isSafeInteger(finished)||finished<began||
      finished-began>maxLatencyMs)throw new Error("ACCOUNT_REVOCATION_UNAVAILABLE");
   if(revoked!==false)throw new Error("ACCOUNT_READ_REVOKED");
   return Object.freeze({verifiedForDisplay:true,financialExecutionEnabled:false});
  }
 });
}
