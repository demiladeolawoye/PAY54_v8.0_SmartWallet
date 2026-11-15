"use strict";
import {requireTrustedPrincipal} from "../domain/trusted-account-principal.mjs";
import {buildAccountQuery} from "./account-query-catalogue.mjs";
import {assertAccountReadStatement} from "./account-sql-policy.mjs";
/* Bind all tenant SELECTs to server-verified principal and fixed SQL only.
 * Not a substitute for Postgres RLS or separate DB least-privilege grants. */
export function createAccountTenantQueryGuard(){
 return Object.freeze({
  prepare({principal,queryId,accountId=null}){
   const subjectId=requireTrustedPrincipal(principal);
   const plan=buildAccountQuery(queryId,subjectId,accountId);
   assertAccountReadStatement(plan.sql,plan.params,subjectId);
   return Object.freeze({sql:plan.sql,params:plan.params,
    principalId:subjectId,readOnly:true,financialExecutionEnabled:false});
  }
 });
}
