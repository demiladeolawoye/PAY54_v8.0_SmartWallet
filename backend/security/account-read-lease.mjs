"use strict";
import {requireAccountDbPrincipal} from "./account-db-principal.mjs";

/* One-use local time-bound authorization lease. Cannot authorize money, issue
 * login credentials or replace real revocation and current membership checks.
 */
export function createAccountReadLease({now=()=>Date.now(),ttlMs=2500}={}){
 if(typeof now!=="function"||!Number.isSafeInteger(ttlMs)||
  ttlMs<100||ttlMs>5000)throw new TypeError("ACCOUNT_LEASE_CONFIG");
 const pending=new WeakMap();
 return Object.freeze({
  issue(dbPrincipal){
   const actor=requireAccountDbPrincipal(dbPrincipal),timestamp=now();
   if(!Number.isSafeInteger(timestamp))throw new Error("ACCOUNT_LEASE_INVALID");
   const ticket=Object.freeze({readOnly:true,financialExecutionEnabled:false});
   pending.set(ticket,{actor,issuedAt:timestamp,consumed:false});
   return ticket;
  },
  consume(ticket){
   const t=ticket&&typeof ticket==="object"?pending.get(ticket):null;
   const time=now();
   if(!t||t.consumed||!Number.isSafeInteger(time)||time<t.issuedAt||
       time-t.issuedAt>ttlMs)throw new Error("ACCOUNT_LEASE_EXPIRED");
   t.consumed=true;
   return Object.freeze({dbPrincipal:t.actor,readOnly:true,
     transactionAuthorized:false,financialExecutionEnabled:false});
  },
  revoke(ticket){if(ticket&&typeof ticket==="object")pending.delete(ticket);}
 });
}
