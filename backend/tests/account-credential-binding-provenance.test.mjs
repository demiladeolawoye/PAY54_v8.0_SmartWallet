"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {createAccountCredentialBinding,requireAccountCredentialBinding} from "../security/account-credential-binding.mjs";

const subjectId="11111111-1111-4111-8111-111111111111";
const tenantId="22222222-2222-4222-8222-222222222222";
const accountId="33333333-3333-4333-8333-333333333333";
const roleName="pay54_tenant_verified_0001";
const evidence=Object.freeze({
 schemaVersion:1,tenantId,accountId,roleName,environment:"test",
 endpointId:"isolated-test-postgres",reviewId:"independent-approval-001",
 rotationEpoch:2,workloadIdentityBound:true,tenantScopedSecretAccess:true,
 noCrossTenantSecretAccess:true,noProvisioningPrivileges:true,
 tlsPeerVerified:true,tlsHostnameVerified:true,endpointAllowlisted:true,
 noRoleSwitching:true,noPhysicalSessionSharing:true,
 financialPrivilegeAbsent:true,customerSelectGrantsAbsent:true,
 independentlyReviewed:true
});
test("217: issued binding has object-origin protection; copies and fabricated objects deny",async()=>{
 const resolver=createTrustedAccountPrincipalResolver({
  verifyServerSession:async()=>({subjectId,authenticated:true,revoked:false,
   expiresAt:Math.floor(Date.now()/1000)+60})
 });
 const principal=await resolver.resolve({});
 const dbPrincipal=createAccountDbPrincipal({principal,roleName,
  assertRoleMapping:()=>true});
 const binding=await createAccountCredentialBinding({
  loadAuthoritativeBinding:async()=>({
   subjectId,tenantId,accountId,roleName,active:true,revoked:false,rotationEpoch:2
  })
 }).verify({dbPrincipal,custodyEvidence:evidence,tenantId,accountId});
 assert.equal(requireAccountCredentialBinding(binding),binding);
 for(const fake of [{...binding},Object.freeze({...binding}),null,
  {principalId:subjectId,tenantId,accountId,roleName,rotationEpoch:2}]){
  assert.throws(()=>requireAccountCredentialBinding(fake),
   /ACCOUNT_CREDENTIAL_BINDING_DENIED/);
 }
 assert.equal(binding.financialExecutionEnabled,false);
 assert.equal(binding.liveCredentialAttested,false);
});
