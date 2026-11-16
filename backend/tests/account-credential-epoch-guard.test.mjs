"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {createAccountCredentialBinding} from "../security/account-credential-binding.mjs";
import {createAccountCredentialEpochGuard} from "../security/account-credential-epoch-guard.mjs";

const subjectId="11111111-1111-4111-8111-111111111111";
const tenantId="22222222-2222-4222-8222-222222222222";
const accountId="33333333-3333-4333-8333-333333333333";
const roleName="pay54_tenant_verified_0001";
const endpointId="isolated-test-postgres";
const evidence={
 schemaVersion:1,tenantId,accountId,roleName,environment:"test",
 endpointId,reviewId:"independent-approval-001",rotationEpoch:2,
 workloadIdentityBound:true,tenantScopedSecretAccess:true,
 noCrossTenantSecretAccess:true,noProvisioningPrivileges:true,
 tlsPeerVerified:true,tlsHostnameVerified:true,endpointAllowlisted:true,
 noRoleSwitching:true,noPhysicalSessionSharing:true,
 financialPrivilegeAbsent:true,customerSelectGrantsAbsent:true,
 independentlyReviewed:true
};
async function binding(){
 const resolver=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
  subjectId,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60
 })});
 const principal=await resolver.resolve({});
 const dbPrincipal=createAccountDbPrincipal({principal,roleName,assertRoleMapping:()=>true});
 return createAccountCredentialBinding({loadAuthoritativeBinding:async()=>({
  subjectId,tenantId,accountId,roleName,active:true,revoked:false,rotationEpoch:2
 })}).verify({dbPrincipal,custodyEvidence:evidence,accountId,tenantId});
}
function authoritative(b){
 return {principalId:b.principalId,tenantId:b.tenantId,accountId:b.accountId,
  roleName:b.roleName,endpointId:b.endpointId,rotationEpoch:b.rotationEpoch,
  active:true,revoked:false};
}
test("222: current credential epoch checked before and after callback",async()=>{
 const b=await binding();let checks=0;
 const guard=createAccountCredentialEpochGuard({loadCurrentCredentialState:async()=>{checks++;return authoritative(b);}});
 assert.equal(await guard.execute({binding:b,callback:async()=>73}),73);
 assert.equal(checks,2);
});
test("222: revoked, rotated or reassigned credential cannot produce a result",async()=>{
 const b=await binding();
 for(const mutate of [
  {rotationEpoch:3},{revoked:true},{active:false},
  {tenantId:accountId},{accountId:tenantId},{principalId:tenantId},
  {roleName:"pay54_tenant_other_0001"},{endpointId:"wrong-endpoint"}
 ]){
  let used=false;
  const guard=createAccountCredentialEpochGuard({
   loadCurrentCredentialState:async()=>({...authoritative(b),...mutate})
  });
  await assert.rejects(()=>guard.execute({
   binding:b,callback:async()=>{used=true;return 7;}
  }),/ACCOUNT_CREDENTIAL_EPOCH_STALE/);
  assert.equal(used,false);
 }
});
test("222: rotation or revocation during callback is denied post-read",async()=>{
 const b=await binding();
 let epoch=2;
 const guard=createAccountCredentialEpochGuard({
  loadCurrentCredentialState:async()=>({...authoritative(b),rotationEpoch:epoch})
 });
 await assert.rejects(()=>guard.execute({binding:b,callback:async()=>{
  epoch=3;return {sensitive:"not disclosed"};
 }}),/ACCOUNT_CREDENTIAL_EPOCH_STALE/);
});
test("222: outage, forged binding and unconfigured verifier deny",async()=>{
 const b=await binding();
 assert.throws(()=>createAccountCredentialEpochGuard({}),/ACCOUNT_EPOCH_READER_REQUIRED/);
 const guard=createAccountCredentialEpochGuard({
  loadCurrentCredentialState:async()=>{throw new Error("SOURCE_OFFLINE");}
 });
 await assert.rejects(()=>guard.execute({binding:b,callback:async()=>1}),/SOURCE_OFFLINE/);
 const fake=createAccountCredentialEpochGuard({
  loadCurrentCredentialState:async()=>authoritative(b)
 });
 await assert.rejects(()=>fake.execute({binding:{...b},callback:async()=>1}),
  /ACCOUNT_CREDENTIAL_BINDING_DENIED/);
 await assert.rejects(()=>fake.execute({binding:b,callback:null}),
  /ACCOUNT_EPOCH_CALLBACK_REQUIRED/);
});
