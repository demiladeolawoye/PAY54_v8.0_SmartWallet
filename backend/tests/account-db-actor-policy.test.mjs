"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assertAccountDbActorPolicy} from "../security/account-db-actor-policy.mjs";
const R="pay54_tenant_verified_0001";
const safe={roleName:R,currentUser:R,sessionUser:R,canLogin:true,superuser:false,
 bypassRls:false,inherit:false,createRole:false,createDb:false,replication:false,
 isOwnerOfCustomerTables:false,hasFinancialPrivilege:false,canAssumeOtherTenantRoles:false,
 membershipsCount:0,rowSecurityEnabled:true,inTransaction:true};
test("least-privilege unchanged database actor metadata passes source policy",()=>{
 const result=assertAccountDbActorPolicy({expectedRole:R,metadata:safe});
 assert.equal(result.liveCredentialAttested,false);
 assert.equal(result.financialExecutionEnabled,false);
});
test("privilege escalation, role switch, inherited rights and forged metadata deny",()=>{
 const changes=[
 {currentUser:"pay54_tenant_other_0002"}, {sessionUser:"admin"},
 {canLogin:false},{superuser:true},{bypassRls:true},{inherit:true},
 {createRole:true},{createDb:true},{replication:true},
 {isOwnerOfCustomerTables:true},{hasFinancialPrivilege:true},
 {canAssumeOtherTenantRoles:true},{membershipsCount:1},
 {rowSecurityEnabled:false},{inTransaction:false}
 ];
 for(const change of changes)assert.throws(()=>assertAccountDbActorPolicy({
   expectedRole:R,metadata:{...safe,...change}
 }),/ACCOUNT_DB_ACTOR_UNTRUSTED/);
 assert.throws(()=>assertAccountDbActorPolicy({expectedRole:"postgres",metadata:safe}),/ACCOUNT_DB_ACTOR_UNTRUSTED/);
});
