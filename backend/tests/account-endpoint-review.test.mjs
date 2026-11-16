"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {createAccountCredentialBinding} from "../security/account-credential-binding.mjs";
import {createAccountEndpointReview} from "../security/account-endpoint-review.mjs";

const SUBJECT="11111111-1111-4111-8111-111111111111";
const TENANT="22222222-2222-4222-8222-222222222222";
const ACCOUNT="33333333-3333-4333-8333-333333333333";
const ROLE="pay54_tenant_verified_0001";
const endpoint={
 endpointId:"isolated-test-postgres",host:"db.test.example.org",
 port:5432,tlsServerName:"db.test.example.org",caSha256:"a".repeat(64),
 rejectUnauthorized:true,tlsRequired:true,allowInsecureFallback:false
};
async function binding(){
 const r=createTrustedAccountPrincipalResolver({
  verifyServerSession:async()=>({
   subjectId:SUBJECT,authenticated:true,revoked:false,
   expiresAt:Math.floor(Date.now()/1000)+60
  })
 });
 const dbPrincipal=createAccountDbPrincipal({
  principal:await r.resolve({}),roleName:ROLE,assertRoleMapping:()=>true
 });
 return createAccountCredentialBinding({
  loadAuthoritativeBinding:async()=>({
   subjectId:SUBJECT,tenantId:TENANT,accountId:ACCOUNT,
   roleName:ROLE,active:true,revoked:false,rotationEpoch:2
  })
 }).verify({dbPrincipal,tenantId:TENANT,accountId:ACCOUNT,custodyEvidence:{
  schemaVersion:1,tenantId:TENANT,accountId:ACCOUNT,roleName:ROLE,
  environment:"test",endpointId:endpoint.endpointId,
  reviewId:"independent-approval-001",rotationEpoch:2,
  workloadIdentityBound:true,tenantScopedSecretAccess:true,
  noCrossTenantSecretAccess:true,noProvisioningPrivileges:true,
  tlsPeerVerified:true,tlsHostnameVerified:true,endpointAllowlisted:true,
  noRoleSwitching:true,noPhysicalSessionSharing:true,
  financialPrivilegeAbsent:true,customerSelectGrantsAbsent:true,
  independentlyReviewed:true
 }});
}
test("245: approved endpoint config yields nonoperational TLS review only",async()=>{
 const b=await binding();
 const review=createAccountEndpointReview({approvedEndpoints:[endpoint]});
 const result=review.review(b);
 assert.equal(result.endpointId,endpoint.endpointId);
 assert.equal(result.tlsConfigReviewed,true);
 assert.equal(result.liveTlsAttested,false);
 assert.equal(result.customerDataAccessEnabled,false);
 assert.equal(result.financialExecutionEnabled,false);
 assert.ok(Object.isFrozen(result));
});
test("245: TLS downgrade, wildcard identity, unapproved host and duplicate endpoints deny",()=>{
 for(const patch of [
  {rejectUnauthorized:false},{tlsRequired:false},
  {allowInsecureFallback:true},{host:"127.0.0.1",tlsServerName:"127.0.0.1"},
  {host:"*.example.org",tlsServerName:"*.example.org"},
  {port:0},{port:65536},{caSha256:"invalid"},
  {host:"db.attacker.example.org"},
  {endpointId:"invalid/name"}
 ]){
  assert.throws(()=>createAccountEndpointReview({
   approvedEndpoints:[{...endpoint,...patch}]
  }),/ACCOUNT_ENDPOINT_REVIEW_INVALID/);
 }
 assert.throws(()=>createAccountEndpointReview({
  approvedEndpoints:[endpoint,endpoint]
 }),/ACCOUNT_ENDPOINT_REVIEW_INVALID/);
});
test("245: wrong endpoint and copied credential cannot be reviewed",async()=>{
 const b=await binding();
 const review=createAccountEndpointReview({approvedEndpoints:[
  {...endpoint,endpointId:"different-approved-database"}
 ]});
 assert.throws(()=>review.review(b),/ACCOUNT_ENDPOINT_DENIED/);
 const approved=createAccountEndpointReview({approvedEndpoints:[endpoint]});
 assert.throws(()=>approved.review({...b}),/ACCOUNT_CREDENTIAL_BINDING_DENIED/);
});
