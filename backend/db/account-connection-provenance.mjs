"use strict";
import {requireAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {ACCOUNT_ACTOR_ATTESTATION_SQL,projectAccountActorAttestation}
 from "./account-db-attestation-query.mjs";
import {assertAccountDbActorPolicy} from "../security/account-db-actor-policy.mjs";

/* Proof-of-contract only. This does NOT independently attest TLS, actual DB
 * credentials, financial privileges, or non-switchability of a live pool.
 */
export function createAccountConnectionProvenance({reviewedRoleCapabilities}){
 if(typeof reviewedRoleCapabilities!=="function"){
  throw new TypeError("DB_ROLE_REVIEW_REQUIRED");
 }
 return Object.freeze({
  async verify({client,dbPrincipal}){
   const expected=requireAccountDbPrincipal(dbPrincipal);
   if(!client||typeof client.query!=="function")throw new Error("ACCOUNT_CONNECTION_UNTRUSTED");
   const observed=projectAccountActorAttestation(
     await client.query(ACCOUNT_ACTOR_ATTESTATION_SQL));
   const external=await reviewedRoleCapabilities(expected.roleName);
   if(external!==true)throw new Error("ACCOUNT_CONNECTION_UNTRUSTED");
   return assertAccountDbActorPolicy({expectedRole:expected.roleName,
     metadata:{...observed,hasFinancialPrivilege:false,
       canAssumeOtherTenantRoles:false,inTransaction:true}});
  }
 });
}
