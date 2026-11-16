"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {createAccountCurrentMembership} from "../domain/account-current-membership.mjs";
const P="11111111-1111-4111-8111-111111111111";
const Q="22222222-2222-4222-8222-222222222222";
const A="33333333-3333-4333-8333-333333333333";
const ROLE="pay54_tenant_verified_0001";
const account={accountId:A,legalOwnerId:P,type:"BUSINESS",displayName:"Business",
 status:"ACTIVE",verificationStatus:"VERIFIED"};
const membership={accountId:A,principalId:P,role:"BUSINESS_VIEWER",status:"ACTIVE"};
async function principal(){
 const resolver=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
 subjectId:P,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60})});
 return createAccountDbPrincipal({principal:await resolver.resolve({}),roleName:ROLE,assertRoleMapping:()=>true});
}
test("fresh verified membership permits display only",async()=>{
 const gate=createAccountCurrentMembership({loadCurrent:async()=>({account,membership})});
 const decision=await gate.assertCurrent({dbPrincipal:await principal(),accountId:A});
 assert.equal(decision.accountId,A);
 assert.equal(decision.financialExecutionEnabled,false);
 assert.equal(decision.requiresAtomicFinancialRevalidation,true);
});
test("cross tenant, revoked membership, unavailable and late store deny",async()=>{
 const dbPrincipal=await principal();
 for(const response of [
 {account,membership:{...membership,principalId:Q}},
 {account,membership:{...membership,status:"REVOKED"}},
 {account:{...account,status:"SUSPENDED"},membership},
 null
 ]){
  const gate=createAccountCurrentMembership({loadCurrent:async()=>response});
  await assert.rejects(()=>gate.assertCurrent({dbPrincipal,accountId:A}),/ACCOUNT_MEMBERSHIP_UNAVAILABLE|ACCOUNT_NOT_AVAILABLE/);
 }
 let tick=0;
 const slow=createAccountCurrentMembership({loadCurrent:async()=>({account,membership}),
  now:()=>tick++===0?1000:5000,maxAgeMs:500});
 await assert.rejects(()=>slow.assertCurrent({dbPrincipal,accountId:A}),/ACCOUNT_MEMBERSHIP_UNAVAILABLE/);
});
