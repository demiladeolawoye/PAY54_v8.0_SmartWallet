"use strict";

/* PAY54 Batch 05 — ephemeral, one-use account-selection request intent.
 * Neither an access token nor a server-authorised account-context switch.
 * Never accept this intent as payment or database access authority.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createAccountSelectionIntentPolicy({now=()=>Date.now(),maxAgeMs=30_000}={}){
  if(typeof now!=="function"||!Number.isSafeInteger(maxAgeMs)||maxAgeMs<1000||maxAgeMs>60_000){
    throw new TypeError("Invalid selection intent policy");
  }
  const pending=new WeakMap();
  return Object.freeze({
    issue({accountId}){
      if(typeof accountId!=="string"||!UUID.test(accountId))throw new Error("ACCOUNT_SELECTION_INVALID");
      const timestamp=now();
      if(!Number.isSafeInteger(timestamp))throw new Error("ACCOUNT_SELECTION_INVALID");
      const intent=Object.freeze({
        requestedAccountId:accountId.toLowerCase(),
        pendingBackendVerification:true,financialExecutionEnabled:false,
        selectionAuthorised:false
      });
      pending.set(intent,{issuedAt:timestamp,consumed:false});
      return intent;
    },
    consume(intent){
      const entry=intent&&typeof intent==="object"?pending.get(intent):null;
      if(!entry||entry.consumed||!Number.isSafeInteger(now())||
         now()<entry.issuedAt||now()-entry.issuedAt>maxAgeMs){
        throw new Error("ACCOUNT_SELECTION_EXPIRED");
      }
      entry.consumed=true;
      return Object.freeze({
        requestedAccountId:intent.requestedAccountId,
        requiresFreshServerMembershipCheck:true,financialExecutionEnabled:false,
        selectionAuthorised:false
      });
    },
    invalidate(intent){if(intent&&typeof intent==="object")pending.delete(intent);}
  });
}
