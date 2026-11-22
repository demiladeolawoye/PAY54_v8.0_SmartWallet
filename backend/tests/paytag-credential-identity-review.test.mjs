"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
  assessPay54PayTagCredentialIdentityReview,
  PAY54_PAYTAG_IDENTITY_REVIEW_POSTURE
} from "../governance/paytag-credential-identity-review.mjs";

const fixture = () => ({
  repository:"demiladeolawoye/PAY54_v8.0_SmartWallet",
  branch:"project-titan",
  sourceSha:"7a75a02dbcdfb6bf85f92ac00c14293192fa8cea",
  migrationSha256:"a".repeat(64),
  reviewTicket:"PAY54-SEC-1001",
  environment:"DISPOSABLE_REVIEW",
  callerRole:"pay54_paytag_register_role",
  functionOwnerRole:"pay54_paytag_function_owner_role",
  runtimeIdentityModel:"UNRESOLVED_NOLOGIN",
  cloudProvider:"UNSELECTED",
  secretCustodyModel:"NOT_PROVISIONED",
  credentialRotationModel:"NOT_PROVISIONED",
  databaseTlsModel:"NOT_ATTESTED",
  privateConnectivityRequired:true,
  backendAuthenticationRequired:true,
  backendRequestAttestationRequired:true,
  leastPrivilegeDatabaseRoleRequired:true,
  noDirectFinancialPrivilegesRequired:true,
  noPublicIngressRequired:true,
  sessionResetOrDiscardRequired:true,
  auditedCredentialRotationRequired:true,
  independentDbaApprovalRequired:true,
  independentSecurityApprovalRequired:true,
  deployRequested:false,
  credentialProvisionRequested:false,
  runtimeRequested:false
});

test("non-secret planning description never authorises a live connection",()=>{
 const result=assessPay54PayTagCredentialIdentityReview(fixture());
 assert.equal(result.requirementShapesValidated,true);
 for(const key of [
  "independentEvidenceVerified","databasePrincipalValidated",
  "databaseLoginIdentityEstablished","tlsConnectionVerified",
  "secretManagerConnected","credentialIssued","rotationPerformed",
  "roleAssumptionApproved","realDatabaseConnected",
  "migrationExecutionAuthorised","persistentStagingAuthorised",
  "productionAuthorised","customerRegistrationAuthorised",
  "financialExecutionAuthorised"
 ]) assert.equal(result[key],false,key);
 assert.ok(result.unresolvedBlockers.includes(
   "NOLOGIN_CALLER_ROLE_HAS_NO_APPROVED_ASSUMPTION_PATH"));
 assert.ok(Object.isFrozen(result));
 assert.ok(Object.isFrozen(result.unresolvedBlockers));
 assert.ok(Object.isFrozen(PAY54_PAYTAG_IDENTITY_REVIEW_POSTURE));
 assert.equal(PAY54_PAYTAG_IDENTITY_REVIEW_POSTURE.credentialAccessEnabled,false);
});

for(const [scenario,changes] of [
 ["wrong repository",{repository:"attacker/repo"}],
 ["untrusted branch",{branch:"main"}],
 ["malformed source sha",{sourceSha:"bad"}],
 ["malformed migration hash",{migrationSha256:"bad"}],
 ["unapproved ticket",{reviewTicket:"UNKNOWN"}],
 ["persistent staging",{environment:"STAGING"}],
 ["production",{environment:"PRODUCTION"}],
 ["different caller role",{callerRole:"postgres"}],
 ["privileged owner",{functionOwnerRole:"postgres"}],
 ["invented login identity",{runtimeIdentityModel:"LOGIN"}],
 ["assumed cloud provider",{cloudProvider:"GCP"}],
 ["provisioned secret",{secretCustodyModel:"SECRET_MANAGER"}],
 ["enabled rotation",{credentialRotationModel:"ROTATING"}],
 ["unverified claimed TLS",{databaseTlsModel:"VERIFIED"}],
 ["deployment request",{deployRequested:true}],
 ["credential provisioning request",{credentialProvisionRequested:true}],
 ["runtime activation request",{runtimeRequested:true}],
 ["missing private connectivity",{privateConnectivityRequired:false}],
 ["missing backend auth",{backendAuthenticationRequired:false}],
 ["missing session reset",{sessionResetOrDiscardRequired:false}],
 ["missing independent DBA review",{independentDbaApprovalRequired:false}],
 ["missing security review",{independentSecurityApprovalRequired:false}],
 ["extra input secret",{databasePassword:"unsafe"}],
 ["extra role override",{allowRoleSwitch:true}],
 ["invalid boolean",{auditedCredentialRotationRequired:"true"}]
]){
 test("rejects "+scenario,()=>{
  assert.throws(
    ()=>assessPay54PayTagCredentialIdentityReview({...fixture(),...changes}),
    /PAY54_PAYTAG_CREDENTIAL_IDENTITY_REVIEW_DENIED/);
 });
}
test("rejects missing data and non-plain/invalid input",()=>{
 const data=fixture();
 delete data.runtimeRequested;
 assert.throws(()=>assessPay54PayTagCredentialIdentityReview(data),
  /PAY54_PAYTAG_CREDENTIAL_IDENTITY_REVIEW_DENIED/);
 for(const value of [null,undefined,[],1,"approved",Object.create(null)]){
  assert.throws(()=>assessPay54PayTagCredentialIdentityReview(value),
   /PAY54_PAYTAG_CREDENTIAL_IDENTITY_REVIEW_DENIED/);
 }
});
