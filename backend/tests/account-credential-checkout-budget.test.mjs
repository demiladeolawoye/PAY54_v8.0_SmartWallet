"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {createAccountCredentialBinding} from "../security/account-credential-binding.mjs";
import {createAccountCredentialCheckoutBudget} from "../db/account-credential-checkout-budget.mjs";

const subjectId="11111111-1111-4111-8111-111111111111";
const tenantId="22222222-2222-4222-8222-222222222222";
const accountId="33333333-3333-4333-8333-333333333333";
const roleName="pay54_tenant_verified_0001";
async function binding(){
 const resolver=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
  subjectId,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60
 })});
 const dbPrincipal=createAccountDbPrincipal({
  principal:await resolver.resolve({}),roleName,assertRoleMapping:()=>true
 });
 return createAccountCredentialBinding({
  loadAuthoritativeBinding:async()=>({
   subjectId,tenantId,accountId,roleName,active:true,revoked:false,
   rotationEpoch:2
  })
 }).verify({dbPrincipal,tenantId,accountId,custodyEvidence:{
  schemaVersion:1,tenantId,accountId,roleName,environment:"test",
  endpointId:"isolated-test-postgres",reviewId:"independent-approval-001",
  rotationEpoch:2,workloadIdentityBound:true,tenantScopedSecretAccess:true,
  noCrossTenantSecretAccess:true,noProvisioningPrivileges:true,
  tlsPeerVerified:true,tlsHostnameVerified:true,endpointAllowlisted:true,
  noRoleSwitching:true,noPhysicalSessionSharing:true,
  financialPrivilegeAbsent:true,customerSelectGrantsAbsent:true,
  independentlyReviewed:true
 }});
}
test("243: overloaded tenant cannot exceed fixed simultaneous checkouts",async()=>{
 const b=await binding();
 const budget=createAccountCredentialCheckoutBudget({
  maxConcurrentPerRole:1,maxConcurrentTotal:2
 });
 let release;
 const barrier=new Promise(resolve=>{release=resolve;});
 let entered;
 const started=new Promise(resolve=>{entered=resolve;});
 const first=budget.execute({binding:b,callback:async()=>{entered();await barrier;return 5;}});
 await started;
 assert.deepEqual(budget.snapshot(),{
  activeTotal:1,activeRoleKeys:1,financialExecutionEnabled:false
 });
 await assert.rejects(()=>budget.execute({binding:b,callback:async()=>9}),
  /ACCOUNT_CHECKOUT_OVER_CAPACITY/);
 await assert.rejects(()=>budget.execute({binding:{...b},callback:async()=>7}),
  /ACCOUNT_CREDENTIAL_BINDING_DENIED/);
 release();
 assert.equal(await first,5);
 assert.equal(budget.snapshot().activeTotal,0);
 assert.equal(await budget.execute({binding:b,callback:async()=>8}),8);
});
test("243: rejected checkout releases capacity on failure and invalid config denies",async()=>{
 const b=await binding();
 const budget=createAccountCredentialCheckoutBudget({
  maxConcurrentPerRole:1,maxConcurrentTotal:1
 });
 await assert.rejects(()=>budget.execute({binding:b,callback:async()=>{
  throw new Error("synthetic cancellation");
 }}),/synthetic cancellation/);
 assert.equal(budget.snapshot().activeTotal,0);
 assert.equal(await budget.execute({binding:b,callback:async()=>42}),42);
 assert.throws(()=>createAccountCredentialCheckoutBudget({
  maxConcurrentPerRole:0
 }),/ACCOUNT_CHECKOUT_BUDGET_INVALID/);
 assert.throws(()=>createAccountCredentialCheckoutBudget({
  maxConcurrentPerRole:3,maxConcurrentTotal:2
 }),/ACCOUNT_CHECKOUT_BUDGET_INVALID/);
});
