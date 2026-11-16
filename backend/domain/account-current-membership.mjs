"use strict";

import {requireAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {assertTenantAccountAccess} from "./account-tenant-boundary.mjs";

/* Membership is server-provided evidence, not a value copied from the client.
 * The source contract does not independently attest storage freshness.
 */
export function createAccountCurrentMembership({loadCurrent,now=()=>Date.now(),maxAgeMs=2000}={}){
 if(typeof loadCurrent!=="function"||typeof now!=="function"||
    !Number.isSafeInteger(maxAgeMs)||maxAgeMs<100||maxAgeMs>5000){
  throw new TypeError("ACCOUNT_MEMBERSHIP_CONFIG_INVALID");
 }
 return Object.freeze({
  async assertCurrent({dbPrincipal,accountId}){
   const actor=requireAccountDbPrincipal(dbPrincipal);
   const started=now();
   if(!Number.isSafeInteger(started))throw new Error("ACCOUNT_MEMBERSHIP_UNAVAILABLE");
   let snapshot;
   try{snapshot=await loadCurrent({principalId:actor.principalId,accountId});}
   catch{throw new Error("ACCOUNT_MEMBERSHIP_UNAVAILABLE");}
   const completed=now();
   if(!Number.isSafeInteger(completed)||completed<started||
       completed-started>maxAgeMs||!snapshot||typeof snapshot!=="object"){
    throw new Error("ACCOUNT_MEMBERSHIP_UNAVAILABLE");
   }
   try{
    const decision=assertTenantAccountAccess({principalId:actor.principalId,
      requestedAccountId:accountId,account:snapshot.account,membership:snapshot.membership});
    return Object.freeze({accountId:decision.accountId,viewEligible:true,
      financialExecutionEnabled:false,requiresAtomicFinancialRevalidation:true});
   }catch{throw new Error("ACCOUNT_NOT_AVAILABLE");}
  }
 });
}
