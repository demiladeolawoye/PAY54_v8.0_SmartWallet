"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {assertAccountRowDecision} from "../domain/account-access-decision.mjs";
const P="11111111-1111-4111-8111-111111111111";
const Q="22222222-2222-4222-8222-222222222222";
const A="33333333-3333-4333-8333-333333333333";
const B="44444444-4444-4444-8444-444444444444";
const ROLE="pay54_tenant_safe_0001";
const row={account_id:A,legal_owner_id:P,type:"BUSINESS",display_name:"Example Ltd",
 status:"ACTIVE",verification_status:"VERIFIED",principal_id:P,
 role:"BUSINESS_VIEWER",membership_status:"ACTIVE"};
async function principal(){
 const verify=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
  subjectId:P,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60
 })});
 return createAccountDbPrincipal({principal:await verify.resolve({}),roleName:ROLE,
  assertRoleMapping:()=>true});
}
test("validated business view exposes a minimal account label with no financial authority",async()=>{
 const dbPrincipal=await principal();
 const verdict=assertAccountRowDecision({dbPrincipal,row,selectedAccountId:A});
 assert.deepEqual(verdict,{accountId:A,type:"BUSINESS",displayName:"Example Ltd",financialExecutionEnabled:false});
});
test("cross-tenant data, stale membership and wrong account selection fail closed",async()=>{
 const dbPrincipal=await principal();
 for(const change of [
  {row:{...row,principal_id:Q}},
  {row:{...row,membership_status:"REVOKED"}},
  {row:{...row,verification_status:"REJECTED",status:"PENDING_VERIFICATION"}},
  {selectedAccountId:B},
  {row:{...row,account_id:B,principal_id:Q}},
  {dbPrincipal:{...dbPrincipal}}
 ]){
  assert.throws(()=>assertAccountRowDecision({dbPrincipal,row,selectedAccountId:A,...change}),
   /ACCOUNT_TENANT_READ_DENIED|DB_PRINCIPAL_DENIED/);
 }
});
