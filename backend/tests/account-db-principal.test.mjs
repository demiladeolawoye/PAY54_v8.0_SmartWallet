"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal,requireAccountDbPrincipal} from "../security/account-db-principal.mjs";
const ID="11111111-1111-4111-8111-111111111111";
const ROLE="pay54_tenant_issuer_0001";
const resolver=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
  subjectId:ID,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60})});
test("source descriptor is opaque, server-verified, immutable and permissionless",async()=>{
 const principal=await resolver.resolve({});
 const result=createAccountDbPrincipal({principal,roleName:ROLE,
   assertRoleMapping:(subject,role)=>subject===ID&&role===ROLE});
 assert.equal(requireAccountDbPrincipal(result),result);
 assert.equal(result.grantsDatabasePrivileges,false);
 assert.equal(result.financialExecutionEnabled,false);
 assert.ok(Object.isFrozen(result));
});
test("forged descriptors, arbitrary role, and unapproved subject mapping fail",async()=>{
 const principal=await resolver.resolve({});
 for(const change of [
  {principal:{subjectId:ID}},
  {roleName:"postgres"},
  {roleName:"pay54_financial_app_role"},
  {assertRoleMapping:()=>false}
 ]){
   assert.throws(()=>createAccountDbPrincipal({principal,roleName:ROLE,assertRoleMapping:()=>true,...change}),
    /DB_PRINCIPAL_DENIED|ACCOUNT_AUTH_REQUIRED/);
 }
 assert.throws(()=>requireAccountDbPrincipal({principalId:ID,roleName:ROLE}),/DB_PRINCIPAL_DENIED/);
});
