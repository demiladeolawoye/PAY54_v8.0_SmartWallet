"use strict";
import {requireAccountDbPrincipal} from "./account-db-principal.mjs";
import {buildAccountQuery} from "../db/account-query-catalogue.mjs";

/* Single-use local read intent; not a bearer credential or a DB identity. */
export function createAccountReadTicketPolicy({now=()=>Date.now(),ttlMs=3000}={}){
 if(typeof now!=="function"||!Number.isSafeInteger(ttlMs)||ttlMs<100||ttlMs>10_000){
  throw new TypeError("READ_TICKET_CONFIG_INVALID");
 }
 const pending=new WeakMap();
 return Object.freeze({
  issue({dbPrincipal,queryId,accountId=null}){
   const descriptor=requireAccountDbPrincipal(dbPrincipal);
   const plan=buildAccountQuery(queryId,descriptor.principalId,accountId);
   const created=now();
   if(!Number.isSafeInteger(created))throw new Error("READ_TICKET_INVALID");
   const ticket=Object.freeze({queryId:plan.id,accountId:accountId?.toLowerCase()??null,
    pendingVerification:true,financialExecutionEnabled:false});
   pending.set(ticket,{dbPrincipal:descriptor,issuedAt:created,plan,used:false});
   return ticket;
  },
  consume(ticket){
   const state=ticket&&typeof ticket==="object"?pending.get(ticket):null;
   const current=now();
   if(!state||state.used||!Number.isSafeInteger(current)||
      current<state.issuedAt||current-state.issuedAt>ttlMs){
    throw new Error("READ_TICKET_EXPIRED");
   }
   state.used=true;
   return Object.freeze({dbPrincipal:state.dbPrincipal,sql:state.plan.sql,
     params:state.plan.params,queryId:state.plan.id,requiresDatabaseActorVerification:true,
     financialExecutionEnabled:false});
  },
  invalidate(ticket){if(ticket&&typeof ticket==="object")pending.delete(ticket);}
 });
}
