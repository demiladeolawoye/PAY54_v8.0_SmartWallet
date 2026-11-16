"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {createAccountCredentialBinding} from "../security/account-credential-binding.mjs";
import {createAccountSelectionIntentPolicy} from "../domain/account-selection-intent.mjs";
import {createAccountCredentialSwitchPreview} from "../domain/account-credential-switch-preview.mjs";

const subjectId="11111111-1111-4111-8111-111111111111";
const tenantId="22222222-2222-4222-8222-222222222222";
const accountId="33333333-3333-4333-8333-333333333333";
const roleName="pay54_tenant_verified_0001";
async function issuedBinding(){
 const resolver=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
  subjectId,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60
 })});
 const principal=await resolver.resolve({});
 const dbPrincipal=createAccountDbPrincipal({principal,roleName,assertRoleMapping:()=>true});
 const evidence={
  schemaVersion:1,tenantId,accountId,roleName,environment:"test",
  endpointId:"isolated-test-postgres",reviewId:"independent-approval-001",
  rotationEpoch:2,workloadIdentityBound:true,tenantScopedSecretAccess:true,
  noCrossTenantSecretAccess:true,noProvisioningPrivileges:true,
  tlsPeerVerified:true,tlsHostnameVerified:true,endpointAllowlisted:true,
  noRoleSwitching:true,noPhysicalSessionSharing:true,
  financialPrivilegeAbsent:true,customerSelectGrantsAbsent:true,
  independentlyReviewed:true
 };
 const binding=await createAccountCredentialBinding({
  loadAuthoritativeBinding:async()=>({
   subjectId,tenantId,accountId,roleName,active:true,revoked:false,rotationEpoch:2
  })
 }).verify({dbPrincipal,custodyEvidence:evidence,tenantId,accountId});
 return {dbPrincipal,binding};
}
test("227: one-use intent produces non-authorising preview only",async()=>{
 const {dbPrincipal,binding}=await issuedBinding();
 const selection=createAccountSelectionIntentPolicy();
 const preview=createAccountCredentialSwitchPreview({
  selectionPolicy:selection,
  membershipGate:{read:async({binding:b,callback})=>callback({
   accountId:b.accountId,displayOnly:true,financialExecutionEnabled:false
  })}
 });
 const intent=selection.issue({accountId});
 const decision=await preview.preview({selectionIntent:intent,dbPrincipal,binding});
 assert.deepEqual(decision,{accountId,previewEligible:true,sessionSwitched:false,
  customerDataAccessEnabled:false,financialExecutionEnabled:false});
 await assert.rejects(()=>preview.preview({
  selectionIntent:intent,dbPrincipal,binding
 }),/ACCOUNT_SELECTION_EXPIRED/);
});
test("227: other-account intent and unavailable membership deny",async()=>{
 const {dbPrincipal,binding}=await issuedBinding();
 const selection=createAccountSelectionIntentPolicy();
 const membershipGate={read:async({callback})=>callback({
  accountId,displayOnly:true,financialExecutionEnabled:false
 })};
 const preview=createAccountCredentialSwitchPreview({selectionPolicy:selection,membershipGate});
 const otherAccount="44444444-4444-4444-8444-444444444444";
 const wrong=selection.issue({accountId:otherAccount});
 await assert.rejects(()=>preview.preview({selectionIntent:wrong,dbPrincipal,binding}),
  /ACCOUNT_SWITCH_PREVIEW_DENIED/);
 await assert.rejects(()=>preview.preview({selectionIntent:wrong,dbPrincipal,binding}),
  /ACCOUNT_SELECTION_EXPIRED/);
 const down=createAccountCredentialSwitchPreview({
  selectionPolicy:selection,membershipGate:{read:async()=>{throw new Error("MEMBERSHIP_REVOKED");}}
 });
 await assert.rejects(()=>down.preview({
  selectionIntent:selection.issue({accountId}),dbPrincipal,binding
 }),/MEMBERSHIP_REVOKED/);
});
test("227: fake binding and invalid configuration cannot preview",async()=>{
 const {dbPrincipal,binding}=await issuedBinding();
 const selection=createAccountSelectionIntentPolicy();
 const preview=createAccountCredentialSwitchPreview({
  selectionPolicy:selection,membershipGate:{read:async()=>0}
 });
 await assert.rejects(()=>preview.preview({
  selectionIntent:selection.issue({accountId}),dbPrincipal,binding:{...binding}
 }),/ACCOUNT_CREDENTIAL_BINDING_DENIED/);
 assert.throws(()=>createAccountCredentialSwitchPreview({}),
  /ACCOUNT_SWITCH_PREVIEW_CONFIG_INVALID/);
});
