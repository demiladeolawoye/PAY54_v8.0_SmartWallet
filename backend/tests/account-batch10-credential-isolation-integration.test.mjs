"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {createAccountCredentialBinding} from "../security/account-credential-binding.mjs";
import {createAccountCredentialEpochGuard} from "../security/account-credential-epoch-guard.mjs";
import {createAccountRolePinnedPool} from "../db/account-role-pinned-pool.mjs";

const principalId="11111111-1111-4111-8111-111111111111";
const tenantId="22222222-2222-4222-8222-222222222222";
const accountId="33333333-3333-4333-8333-333333333333";
const roleName="pay54_tenant_verified_0001";
const endpointId="isolated-test-postgres";
async function approvedBinding(){
 const resolver=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
  subjectId:principalId,authenticated:true,revoked:false,
  expiresAt:Math.floor(Date.now()/1000)+60
 })});
 const subject=await resolver.resolve({});
 const dbPrincipal=createAccountDbPrincipal({
  principal:subject,roleName,assertRoleMapping:()=>true
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
 return createAccountCredentialBinding({
  loadAuthoritativeBinding:async()=>({
   subjectId:principalId,tenantId,accountId,roleName,
   active:true,revoked:false,rotationEpoch:2
  })
 }).verify({dbPrincipal,custodyEvidence,tenantId,accountId});
}
function state(binding){
 return {principalId:binding.principalId,tenantId:binding.tenantId,
  accountId:binding.accountId,roleName:binding.roleName,
  endpointId:binding.endpointId,rotationEpoch:binding.rotationEpoch,
  active:true,revoked:false};
}
function attestation(binding){
 return {sessionUser:binding.roleName,currentUser:binding.roleName,
  rotationEpoch:binding.rotationEpoch,endpointId:binding.endpointId,
  financialPrivilegeAbsent:true,nonSwitchable:true};
}
test("223: binding + pre/post epoch + pinned checkout complete with physical discard",async()=>{
 const binding=await approvedBinding();
 let checks=0;const releases=[];let queries=0;
 const epoch=createAccountCredentialEpochGuard({
  loadCurrentCredentialState:async()=>{checks++;return state(binding);}
 });
 const pool=createAccountRolePinnedPool({
  connectForBinding:async()=>({
   query:async()=>{queries++;return {rows:[]};},
   release:discard=>releases.push(discard)
  }),
  reviewConnection:async(_,b)=>attestation(b)
 });
 const value=await epoch.execute({
  binding,callback:async issued=>pool.withClient({
   binding:issued,callback:async client=>{
    const response=await client.query("SELECT 1");
    assert.deepEqual(response.rows,[]);
    return Object.freeze({sourceTestOnly:true,customerDataAccessEnabled:false});
   }
  })
 });
 assert.equal(value.sourceTestOnly,true);
 assert.equal(value.customerDataAccessEnabled,false);
 assert.equal(checks,2);
 assert.equal(queries,1);
 assert.deepEqual(releases,[true]);
});
test("223: post-query revocation rejects result after client discard",async()=>{
 const binding=await approvedBinding();
 let currentEpoch=2;const releases=[];
 const epoch=createAccountCredentialEpochGuard({
  loadCurrentCredentialState:async()=>({...state(binding),rotationEpoch:currentEpoch})
 });
 const pool=createAccountRolePinnedPool({
  connectForBinding:async()=>({
   query:async()=>({rows:[]}),release:discard=>releases.push(discard)
  }),reviewConnection:async(_,b)=>attestation(b)
 });
 await assert.rejects(()=>epoch.execute({binding,callback:async issued=>
  pool.withClient({binding:issued,callback:async()=>{
   currentEpoch=3;
   return Object.freeze({mustNotBeDisclosed:true});
  }})
 }),/ACCOUNT_CREDENTIAL_EPOCH_STALE/);
 assert.deepEqual(releases,[true]);
});
test("223: forged binding never reaches DB connection callback",async()=>{
 const binding=await approvedBinding();
 let connected=false;
 const pool=createAccountRolePinnedPool({
  connectForBinding:async()=>{connected=true;return null;},
  reviewConnection:async(_,b)=>attestation(b)
 });
 await assert.rejects(()=>pool.withClient({
  binding:{...binding},callback:async()=>0
 }),/ACCOUNT_CREDENTIAL_BINDING_DENIED/);
 assert.equal(connected,false);
});
