"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {createAccountConnectionProvenance} from "../db/account-connection-provenance.mjs";
const P="11111111-1111-4111-8111-111111111111",ROLE="pay54_tenant_verified_0001";
const row={current_user_name:ROLE,session_user_name:ROLE,can_login:true,superuser:false,
 bypass_rls:false,inherit:false,create_role:false,create_db:false,replication:false,
 memberships_count:0,row_security_enabled:true,customer_table_ownership_count:0};
async function principal(){
 const r=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
  subjectId:P,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60})});
 return createAccountDbPrincipal({principal:await r.resolve({}),roleName:ROLE,
  assertRoleMapping:()=>true});
}
test("reviewed database role and intact session actor produce advisory provenance",async()=>{
 const dbPrincipal=await principal();
 const result=await createAccountConnectionProvenance({
  reviewedRoleCapabilities:async()=>({hasFinancialPrivilege:false,canAssumeOtherTenantRoles:false,validatedInTransaction:true})
 }).verify({dbPrincipal,client:{query:async()=>({rows:[row]})}});
 assert.equal(result.liveCredentialAttested,false);
 assert.equal(result.financialExecutionEnabled,false);
});
test("role switching, bypass, inherited membership and external review failures deny",async()=>{
 const dbPrincipal=await principal();
 for(const change of [
  {session_user_name:"postgres"},{current_user_name:"pay54_tenant_other_0001"},
  {bypass_rls:true},{memberships_count:1},{superuser:true},
  {row_security_enabled:false},{customer_table_ownership_count:1}
 ]){
  await assert.rejects(()=>createAccountConnectionProvenance({
   reviewedRoleCapabilities:async()=>({hasFinancialPrivilege:false,canAssumeOtherTenantRoles:false,validatedInTransaction:true})
  }).verify({dbPrincipal,client:{query:async()=>({rows:[{...row,...change}]})}}),
    /ACCOUNT_DB_ACTOR_UNTRUSTED/);
 }
 await assert.rejects(()=>createAccountConnectionProvenance({
  reviewedRoleCapabilities:async()=>false
 }).verify({dbPrincipal,client:{query:async()=>({rows:[row]})}}),
  /ACCOUNT_CONNECTION_UNTRUSTED/);
});
