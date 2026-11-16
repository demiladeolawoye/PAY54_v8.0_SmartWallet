"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {createAccountCredentialBinding} from "../security/account-credential-binding.mjs";
import {createAccountCredentialRequestFence} from "../security/account-credential-request-fence.mjs";

const SUBJECT="11111111-1111-4111-8111-111111111111";
const TENANT="22222222-2222-4222-8222-222222222222";
const ACCOUNT="33333333-3333-4333-8333-333333333333";
const OTHER="44444444-4444-4444-8444-444444444444";
const ROLE="pay54_tenant_verified_0001";
async function makeBinding(){
 const resolver=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
  subjectId:SUBJECT,authenticated:true,revoked:false,
  expiresAt:Math.floor(Date.now()/1000)+60
 })});
 const dbPrincipal=createAccountDbPrincipal({
  principal:await resolver.resolve({}),roleName:ROLE,assertRoleMapping:()=>true
 });
 return createAccountCredentialBinding({
  loadAuthoritativeBinding:async()=>({
   subjectId:SUBJECT,tenantId:TENANT,accountId:ACCOUNT,roleName:ROLE,
   active:true,revoked:false,rotationEpoch:3
  })
 }).verify({dbPrincipal,tenantId:TENANT,accountId:ACCOUNT,custodyEvidence:{
  schemaVersion:1,tenantId:TENANT,accountId:ACCOUNT,roleName:ROLE,
  environment:"test",endpointId:"isolated-test-postgres",
  reviewId:"independent-approval-001",rotationEpoch:3,
  workloadIdentityBound:true,tenantScopedSecretAccess:true,
  noCrossTenantSecretAccess:true,noProvisioningPrivileges:true,
  tlsPeerVerified:true,tlsHostnameVerified:true,endpointAllowlisted:true,
  noRoleSwitching:true,noPhysicalSessionSharing:true,
  financialPrivilegeAbsent:true,customerSelectGrantsAbsent:true,
  independentlyReviewed:true
 }});
}
test("249: issued request bound to exact account, tenant and object origin",async()=>{
 const binding=await makeBinding();
 const fence=createAccountCredentialRequestFence();
 const token=fence.issue({
  binding,requestedAccountId:ACCOUNT,requestedTenantId:TENANT
 });
 const decision=fence.consume({binding,token});
 assert.equal(decision.accountId,ACCOUNT);
 assert.equal(decision.tenantId,TENANT);
 assert.equal(decision.rotationEpoch,3);
 assert.equal(decision.financialExecutionEnabled,false);
 assert.equal(decision.customerDataAccessEnabled,false);
 assert.ok(Object.isFrozen(decision));
 await assert.rejects(async()=>fence.consume({binding,token}),
  /ACCOUNT_REQUEST_FENCE_EXPIRED/);
});
test("249: cross-account issue, copied binding, forged token and cross-fence replay denied",async()=>{
 const binding=await makeBinding();
 const fence=createAccountCredentialRequestFence();
 for(const change of [
  {requestedAccountId:OTHER},{requestedTenantId:OTHER}
 ]){
  assert.throws(()=>fence.issue({
   binding,requestedAccountId:ACCOUNT,requestedTenantId:TENANT,...change
  }),/ACCOUNT_REQUEST_FENCE_DENIED/);
 }
 assert.throws(()=>fence.issue({
  binding:{...binding},requestedAccountId:ACCOUNT,requestedTenantId:TENANT
 }),/ACCOUNT_CREDENTIAL_BINDING_DENIED/);
 const token=fence.issue({
  binding,requestedAccountId:ACCOUNT,requestedTenantId:TENANT
 });
 for(const fake of [{...token},Object.freeze({...token})]){
  assert.throws(()=>fence.consume({token:fake,binding}),
   /ACCOUNT_REQUEST_FENCE_EXPIRED/);
 }
 const otherFence=createAccountCredentialRequestFence();
 assert.throws(()=>otherFence.consume({token,binding}),
  /ACCOUNT_REQUEST_FENCE_EXPIRED/);
});
test("249: expired, backwards clock and invalid TTL never grant",async()=>{
 const binding=await makeBinding();
 let tick=1000;
 const fence=createAccountCredentialRequestFence({
  now:()=>tick,maxAgeMs:100
 });
 const token=fence.issue({
  binding,requestedAccountId:ACCOUNT,requestedTenantId:TENANT
 });
 tick=1101;
 assert.throws(()=>fence.consume({binding,token}),
  /ACCOUNT_REQUEST_FENCE_EXPIRED/);
 tick=900;
 assert.throws(()=>fence.consume({binding,token}),
  /ACCOUNT_REQUEST_FENCE_EXPIRED/);
 assert.throws(()=>createAccountCredentialRequestFence({maxAgeMs:0}),
  /ACCOUNT_REQUEST_FENCE_CONFIG_INVALID/);
});
