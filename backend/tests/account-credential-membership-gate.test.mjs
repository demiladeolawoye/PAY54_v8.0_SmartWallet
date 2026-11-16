"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {createAccountCredentialBinding} from "../security/account-credential-binding.mjs";
import {createAccountCredentialEpochGuard} from "../security/account-credential-epoch-guard.mjs";
import {createAccountCredentialMembershipGate} from "../domain/account-credential-membership-gate.mjs";

const principalId="11111111-1111-4111-8111-111111111111";
const tenantId="22222222-2222-4222-8222-222222222222";
const accountId="33333333-3333-4333-8333-333333333333";
const roleName="pay54_tenant_verified_0001";
const endpointId="isolated-test-postgres";
async function setup() {
 const resolver=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
  subjectId:principalId,authenticated:true,revoked:false,
  expiresAt:Math.floor(Date.now()/1000)+60
 })});
 const principal=await resolver.resolve({});
 const dbPrincipal=createAccountDbPrincipal({
  principal,roleName,assertRoleMapping:()=>true
 });
 const custodyEvidence={
  schemaVersion:1,tenantId,accountId,roleName,environment:"test",endpointId,
  reviewId:"independent-approval-001",rotationEpoch:2,
  workloadIdentityBound:true,tenantScopedSecretAccess:true,
  noCrossTenantSecretAccess:true,noProvisioningPrivileges:true,
  tlsPeerVerified:true,tlsHostnameVerified:true,endpointAllowlisted:true,
  noRoleSwitching:true,noPhysicalSessionSharing:true,
  financialPrivilegeAbsent:true,customerSelectGrantsAbsent:true,
  independentlyReviewed:true
 };
 const binding=await createAccountCredentialBinding({
  loadAuthoritativeBinding:async()=>({
   subjectId:principalId,tenantId,accountId,roleName,
   active:true,revoked:false,rotationEpoch:2
  })
 }).verify({dbPrincipal,custodyEvidence,tenantId,accountId});
 return {dbPrincipal,binding};
}
function epoch(binding){
 return createAccountCredentialEpochGuard({
  loadCurrentCredentialState:async()=>({
   principalId,tenantId,accountId,roleName,endpointId,
   rotationEpoch:2,active:true,revoked:false
  })
 });
}
test("225: Personal/Business display composition rechecks membership twice",async()=>{
 const {dbPrincipal,binding}=await setup();
 let checked=0;
 const gate=createAccountCredentialMembershipGate({
  membershipGate:{assertCurrent:async()=>{checked++;return {
   accountId,viewEligible:true,financialExecutionEnabled:false
  };}},epochGuard:epoch(binding)
 });
 const result=await gate.read({dbPrincipal,binding,callback:async context=>{
  assert.deepEqual(context,{principalId,accountId,tenantId,
   displayOnly:true,financialExecutionEnabled:false});
  return Object.freeze({label:"Business"});
 }});
 assert.equal(result.label,"Business");
 assert.equal(checked,2);
});
test("225: membership revocation during read suppresses result",async()=>{
 const {dbPrincipal,binding}=await setup();
 let checks=0;
 const gate=createAccountCredentialMembershipGate({
  membershipGate:{assertCurrent:async()=>{
   checks++;
   return {accountId,viewEligible:checks===1,
    financialExecutionEnabled:false};
  }},epochGuard:epoch(binding)
 });
 await assert.rejects(()=>gate.read({
  dbPrincipal,binding,callback:async()=>({privateLabel:"do not disclose"})
 }),/ACCOUNT_CREDENTIAL_MEMBERSHIP_DENIED/);
 assert.equal(checks,2);
});
test("225: denied membership, mismatched principal and forged binding never disclose",async()=>{
 const {dbPrincipal,binding}=await setup();
 let disclosure=false;
 const gate=createAccountCredentialMembershipGate({
  membershipGate:{assertCurrent:async()=>({accountId,viewEligible:false,
   financialExecutionEnabled:false})},epochGuard:epoch(binding)
 });
 await assert.rejects(()=>gate.read({dbPrincipal,binding,callback:async()=>{
  disclosure=true;return "leak";
 }}),/ACCOUNT_CREDENTIAL_MEMBERSHIP_DENIED/);
 assert.equal(disclosure,false);
 await assert.rejects(()=>gate.read({dbPrincipal,binding:{...binding},
  callback:async()=>1}),/ACCOUNT_CREDENTIAL_BINDING_DENIED/);
 await assert.rejects(()=>gate.read({dbPrincipal:{...dbPrincipal},
  binding,callback:async()=>1}),/DB_PRINCIPAL_DENIED/);
 assert.throws(()=>createAccountCredentialMembershipGate({}),
  /ACCOUNT_CREDENTIAL_MEMBERSHIP_GATE_REQUIRED/);
});
