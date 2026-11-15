"use strict";
import test from "node:test";import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountTenantQueryGuard} from "../db/account-tenant-query-guard.mjs";
const P="11111111-1111-4111-8111-111111111111",A="22222222-2222-4222-8222-222222222222";
const principalResolver=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
 subjectId:P,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60})});
test("account selection is bound to verified subject and UUID parameters",async()=>{
 const principal=await principalResolver.resolve({});
 const v=createAccountTenantQueryGuard().prepare({principal,queryId:"ACCOUNT_SELECT",accountId:A});
 assert.deepEqual(v.params,[P,A]);assert.equal(v.readOnly,true);assert.equal(v.financialExecutionEnabled,false);
});
test("forged tenant identity and injected account SQL cannot prepare",async()=>{
 const p=await principalResolver.resolve({});
 const guard=createAccountTenantQueryGuard();
 assert.throws(()=>guard.prepare({principal:{subjectId:P},queryId:"ACCOUNT_LIST"}),/ACCOUNT_AUTH_REQUIRED/);
 assert.throws(()=>guard.prepare({principal:p,queryId:"UPDATE pay54.wallets"}),/UNAPPROVED_ACCOUNT_QUERY/);
 assert.throws(()=>guard.prepare({principal:p,queryId:"ACCOUNT_SELECT",accountId:"' OR TRUE --"}),/UNAPPROVED_ACCOUNT_QUERY/);
});
