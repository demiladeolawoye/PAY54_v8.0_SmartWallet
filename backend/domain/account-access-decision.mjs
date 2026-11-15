"use strict";
import {requireAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {assertTenantAccountAccess} from "./account-tenant-boundary.mjs";

/* Application-level row decision after SQL + verified actor. Defense-in-depth:
 * never a substitute for PostgreSQL RLS or transaction-consistent financial auth.
 */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function assertAccountRowDecision({dbPrincipal,row,selectedAccountId=null}){
 const subject=requireAccountDbPrincipal(dbPrincipal).principalId;
 if(!row||typeof row!=="object"||Array.isArray(row)){
  throw new Error("ACCOUNT_TENANT_READ_DENIED");
 }
 const accountId=row.account_id;
 if(typeof accountId!=="string"||!UUID.test(accountId)||
    (selectedAccountId!==null &&
      (typeof selectedAccountId!=="string"||selectedAccountId.toLowerCase()!==accountId.toLowerCase()))){
  throw new Error("ACCOUNT_TENANT_READ_DENIED");
 }
 const account={
  accountId,legalOwnerId:row.legal_owner_id,type:row.type,
  displayName:row.display_name,status:row.status,
  verificationStatus:row.verification_status
 };
 const membership={
  accountId,principalId:row.principal_id,role:row.role,
  status:row.membership_status
 };
 try{
  assertTenantAccountAccess({principalId:subject,account,membership,requestedAccountId:accountId});
 }catch{
  throw new Error("ACCOUNT_TENANT_READ_DENIED");
 }
 return Object.freeze({
  accountId:accountId.toLowerCase(),type:row.type,displayName:row.display_name,
  financialExecutionEnabled:false
 });
}
