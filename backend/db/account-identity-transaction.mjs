"use strict";
import {requireTrustedPrincipal} from "../domain/trusted-account-principal.mjs";
import {buildAccountQuery} from "./account-query-catalogue.mjs";
/* Source-only account identity binding. Does not set client-writable custom
 * PostgreSQL variables; caller must inject transaction with least-privilege role.
 */
export function createIdentityScopedAccountTransaction({transaction}) {
 if(!transaction||typeof transaction.execute!=="function"){
   throw new TypeError("READ_ONLY_TRANSACTION_REQUIRED");
 }
 return Object.freeze({
  async execute({principal,queryId,accountId=null}){
   const subject=requireTrustedPrincipal(principal);
   const {sql,params}=buildAccountQuery(queryId,subject,accountId);
   const result=await transaction.execute({principal,sql,params});
   if(!result||!Array.isArray(result.rows)||result.rows.length>100){
     throw new Error("ACCOUNT_QUERY_FAILED");
   }
   return Object.freeze({rows:Object.freeze(result.rows.map(r=>Object.freeze({...r}))),
     financialExecutionEnabled:false});
  }
 });
}
