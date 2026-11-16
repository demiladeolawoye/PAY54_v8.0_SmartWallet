"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {createAccountCredentialBinding} from "../security/account-credential-binding.mjs";
import {createAccountOwnershipReview} from "../domain/account-ownership-review.mjs";

const SUBJECT="11111111-1111-4111-8111-111111111111";
const TENANT="22222222-2222-4222-8222-222222222222";
const ACCOUNT="33333333-3333-4333-8333-333333333333";
const OTHER="44444444-4444-4444-8444-444444444444";
const ROLE="pay54_tenant_verified_0001";
const EVIDENCE=Object.freeze({
 schemaVersion:1,tenantId:TENANT,accountId:ACCOUNT,roleName:ROLE,
 environment:"test",endpointId:"isolated-test-postgres",
 reviewId:"independent-approval-001",rotationEpoch:2,
 workloadIdentityBound:true,tenantScopedSecretAccess:true,
 noCrossTenantSecretAccess:true,noProvisioningPrivileges:true,
 tlsPeerVerified:true,tlsHostnameVerified:true,endpointAllowlisted:true,
 noRoleSwitching:true,noPhysicalSessionSharing:true,
 financialPrivilegeAbsent:true,customerSelectGrantsAbsent:true,
 independentlyReviewed:true
});
async function identities(){
 const resolver=createTrustedAccountPrincipalResolver({
  verifyServerSession:async()=>({
   subjectId:SUBJECT,authenticated:true,revoked:false,
   expiresAt:Math.floor(Date.now()/1000)+60
  })
 });
 const dbPrincipal=createAccountDbPrincipal({
  principal:await resolver.resolve({}),roleName:ROLE,assertRoleMapping:()=>true
 });
 const binding=await createAccountCredentialBinding({
  loadAuthoritativeBinding:async()=>({
   subjectId:SUBJECT,tenantId:TENANT,accountId:ACCOUNT,roleName:ROLE,
   active:true,revoked:false,rotationEpoch:2
  })
 }).verify({dbPrincipal,custodyEvidence:EVIDENCE,tenantId:TENANT,accountId:ACCOUNT});
 return {dbPrincipal,binding};
}
function current(type="PERSONAL"){
 return {
  tenantId:TENANT,
  account:{
   accountId:ACCOUNT,legalOwnerId:SUBJECT,type,
   displayName:type==="PERSONAL"?"My Account":"My Company",
   status:"ACTIVE",verificationStatus:"VERIFIED"
  },
  membership:{
   accountId:ACCOUNT,principalId:SUBJECT,
   role:type==="PERSONAL"?"PERSONAL_OWNER":"BUSINESS_VIEWER",
   status:"ACTIVE"
  }
 };
}
test("229: Personal owner and delegated Business viewer are display-eligible only",async()=>{
 const actor=await identities();
 for(const type of ["PERSONAL","BUSINESS"]){
  const review=createAccountOwnershipReview({
   loadCurrentAccountContext:async()=>current(type)
  });
  const result=await review.review(actor);
  assert.equal(result.accountType,type);
  assert.equal(result.viewEligible,true);
  assert.equal(result.financialExecutionEnabled,false);
  assert.equal(result.customerDataAccessEnabled,false);
  assert.equal(result.sessionSwitched,false);
  assert.ok(Object.isFrozen(result));
 }
});
test("229: different tenant, account, owner, principal, account status or membership denied",async()=>{
 const actor=await identities();
 const baseline=current();
 for(const context of [
  {...baseline,tenantId:OTHER},
  {...baseline,account:{...baseline.account,accountId:OTHER}},
  {...baseline,account:{...baseline.account,legalOwnerId:OTHER}},
  {...baseline,account:{...baseline.account,status:"SUSPENDED"}},
  {...baseline,membership:{...baseline.membership,principalId:OTHER}},
  {...baseline,membership:{...baseline.membership,status:"REVOKED"}},
  {...baseline,membership:{...baseline.membership,role:"BUSINESS_OWNER"}},
  {...baseline,account:{...baseline.account,type:"BUSINESS"},membership:{
   ...baseline.membership,role:"PERSONAL_OWNER"
  }},
  null
 ]){
  const review=createAccountOwnershipReview({
   loadCurrentAccountContext:async()=>context
  });
  await assert.rejects(()=>review.review(actor),/ACCOUNT_OWNER_CONTEXT_DENIED/);
 }
});
test("229: forged binding, forged actor and source outage fail closed",async()=>{
 const actor=await identities();
 let accessed=false;
 const review=createAccountOwnershipReview({
  loadCurrentAccountContext:async()=>{accessed=true;return current();}
 });
 await assert.rejects(()=>review.review({...actor,binding:{...actor.binding}}),
  /ACCOUNT_CREDENTIAL_BINDING_DENIED/);
 await assert.rejects(()=>review.review({...actor,dbPrincipal:{...actor.dbPrincipal}}),
  /DB_PRINCIPAL_DENIED/);
 assert.equal(accessed,false);
 const down=createAccountOwnershipReview({
  loadCurrentAccountContext:async()=>{throw new Error("SQL details");}
 });
 await assert.rejects(()=>down.review(actor),/ACCOUNT_OWNER_CONTEXT_UNAVAILABLE/);
 assert.throws(()=>createAccountOwnershipReview(),
  /ACCOUNT_OWNER_CONTEXT_SOURCE_REQUIRED/);
});
