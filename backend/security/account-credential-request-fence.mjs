"use strict";
import {requireAccountCredentialBinding} from "./account-credential-binding.mjs";

/*
 * PAY54 Batch 10 item 248 — one-use test-only account request fence.
 * Prevents reusing an issued account/tenant/role/epoch intent across retries.
 * Does not authenticate a user, authorise SQL or connect to live PostgreSQL.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createAccountCredentialRequestFence({
 now=()=>Date.now(),maxAgeMs=5000
}={}){
 if(typeof now!=="function" || !Number.isSafeInteger(maxAgeMs) ||
    maxAgeMs<100 || maxAgeMs>30000){
  throw new TypeError("ACCOUNT_REQUEST_FENCE_CONFIG_INVALID");
 }
 const issued=new WeakMap();
 return Object.freeze({
  issue({binding,requestedAccountId,requestedTenantId}){
   const b=requireAccountCredentialBinding(binding);
   if(b.environment!=="test" ||
      typeof requestedAccountId!=="string" || !UUID.test(requestedAccountId) ||
      typeof requestedTenantId!=="string" || !UUID.test(requestedTenantId) ||
      b.accountId!==requestedAccountId.toLowerCase() ||
      b.tenantId!==requestedTenantId.toLowerCase()){
    throw new Error("ACCOUNT_REQUEST_FENCE_DENIED");
   }
   const stamp=now();
   if(!Number.isSafeInteger(stamp))throw new Error("ACCOUNT_REQUEST_FENCE_DENIED");
   const token=Object.freeze({
    accountId:b.accountId,tenantId:b.tenantId,rotationEpoch:b.rotationEpoch,
    previewOnly:true,financialExecutionEnabled:false
   });
   issued.set(token,{binding:b,issuedAt:stamp,consumed:false});
   return token;
  },
  consume({token,binding}){
   const b=requireAccountCredentialBinding(binding);
   const saved=token&&typeof token==="object"?issued.get(token):null;
   const stamp=now();
   if(!saved || saved.consumed || saved.binding!==b ||
      !Number.isSafeInteger(stamp) || stamp<saved.issuedAt ||
      stamp-saved.issuedAt>maxAgeMs){
    throw new Error("ACCOUNT_REQUEST_FENCE_EXPIRED");
   }
   saved.consumed=true;
   return Object.freeze({
    accountId:b.accountId,tenantId:b.tenantId,
    rotationEpoch:b.rotationEpoch,displayOnly:true,
    customerDataAccessEnabled:false,financialExecutionEnabled:false
   });
  }
 });
}
