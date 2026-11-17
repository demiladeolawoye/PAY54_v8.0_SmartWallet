"use strict";
/** Batch27/1081: Compare actual PG grants to reviewed canonical function-only roles. */
const ROLES=Object.freeze([
 "pay54_session_read_role","pay54_account_directory_read_role",
 "pay54_session_rotate_role","pay54_session_issue_role"]);
const deny=()=>{throw Error("PAY54_STAGING_ROLE_GRANT_DRIFT_DENIED");};
export function inspectPay54StagingRoleGrantDrift({rows}={}){
 if(!Array.isArray(rows)||rows.length!==4)deny();
 const seen=new Set();
 for(const r of rows){
  if(!r||!ROLES.includes(r.role_name)||seen.has(r.role_name)||
     r.rolcanlogin!==false||r.rolsuper!==false||
     r.rolbypassrls!==false||r.rolinherit!==false||
     r.rolcreaterole!==false||r.rolcreatedb!==false||
     r.has_ledger_write!==false||r.has_audit_write!==false)deny();
  seen.add(r.role_name);
 }
 if(seen.size!==4)deny();
 return Object.freeze({
  schema:"pay54.postgres-four-role-grant-review.v1",
  restrictedRoleCount:4,financialDmlExcluded:true,
  pgCatalogResponseAuthenticityIndependentlyVerified:false,
  ownerRoleMembershipsInspected:false,
  actualStagingConnectionEstablishedByThisModule:false,
  migrationAuthorised:false
 });
}
