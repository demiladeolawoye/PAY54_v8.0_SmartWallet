"use strict";
import {randomUUID} from "node:crypto";
import {requireAccountDbPrincipal} from "./account-db-principal.mjs";

/* Replay-resistance contract bound to server-issued actor and query identifier.
 * Backend atomicClaim must be durable and globally consistent; a local stub is
 * suitable for CI only. No DB principal, session or permission is issued here.
 */
const QUERY_IDS=new Set(["ACCOUNT_LIST","ACCOUNT_SELECT"]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function createDbReadIntentGate({atomicClaim,now=()=>Date.now(),
 makeId=randomUUID,ttlMs=5000}={}){
 if(typeof atomicClaim!=="function"||typeof now!=="function"||
   typeof makeId!=="function"||!Number.isSafeInteger(ttlMs)||
   ttlMs<100||ttlMs>10000)throw new TypeError("DB_INTENT_CONFIG_INVALID");
 return Object.freeze({
  async authorise({dbPrincipal,queryId,nonce}){
   const principal=requireAccountDbPrincipal(dbPrincipal);
   const timestamp=now();
   if(!QUERY_IDS.has(queryId)||typeof nonce!=="string"||!UUID.test(nonce)||
      !Number.isSafeInteger(timestamp))throw new Error("DB_INTENT_DENIED");
   const correlation=makeId();
   if(typeof correlation!=="string"||!UUID.test(correlation))throw new Error("DB_INTENT_DENIED");
   let accepted;
   try{
    accepted=await atomicClaim({nonce,principalId:principal.principalId,
      roleName:principal.roleName,queryId,expiresAt:timestamp+ttlMs});
   }catch{throw new Error("DB_INTENT_BACKEND_UNAVAILABLE");}
   if(accepted!==true||!Number.isSafeInteger(now())||now()<timestamp||
      now()-timestamp>ttlMs)throw new Error("DB_INTENT_DENIED");
   return Object.freeze({correlationId:correlation,readOnly:true,
     requiresDatabaseActorVerification:true,financialExecutionEnabled:false});
  }
 });
}
