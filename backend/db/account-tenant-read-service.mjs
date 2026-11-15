"use strict";
import {assertAccountRowDecision} from "../domain/account-access-decision.mjs";

/* Unmounted, read-only Personal/Business account label flow.
 * Both an issued ticket and a source-verified DB actor are required. No
 * financial posting, account switching, credentials or listener.
 */
export function createAccountTenantReadService({ticketPolicy,actorTransaction}){
 if(!ticketPolicy||typeof ticketPolicy.consume!=="function"||
    !actorTransaction||typeof actorTransaction.execute!=="function"){
  throw new TypeError("ACCOUNT_READ_SERVICE_CONFIG_INVALID");
 }
 return Object.freeze({
  async read(ticket){
   const plan=ticketPolicy.consume(ticket);
   if(!["ACCOUNT_LIST","ACCOUNT_SELECT"].includes(plan.queryId)){
    throw new Error("ACCOUNT_READ_SCOPE_DENIED");
   }
   const result=await actorTransaction.execute({
    dbPrincipal:plan.dbPrincipal,sql:plan.sql,params:plan.params
   });
   if(!result||!Array.isArray(result.rows)||result.rows.length>100){
    throw new Error("ACCOUNT_READ_UNAVAILABLE");
   }
   const chosen=plan.queryId==="ACCOUNT_SELECT"?plan.params[1]:null;
   const seen=new Set(),accounts=[];
   for(const row of result.rows){
    const projected=assertAccountRowDecision({
      dbPrincipal:plan.dbPrincipal,row,selectedAccountId:chosen
    });
    if(seen.has(projected.accountId))throw new Error("ACCOUNT_DUPLICATE_DISCLOSURE");
    seen.add(projected.accountId);
    accounts.push(projected);
   }
   if(chosen!==null && accounts.length!==1)throw new Error("ACCOUNT_READ_UNAVAILABLE");
   return Object.freeze({accounts:Object.freeze(accounts),
    approvedForDisplayOnly:true,financialExecutionEnabled:false});
  }
 });
}
