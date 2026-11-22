"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
 reviewPay54PayTagConnectionCustody,
 PAY54_PAYTAG_CONNECTION_CUSTODY_POSTURE
} from "../governance/paytag-connection-custody-review.mjs";

const fixture=()=>({
 environment:"DISPOSABLE_SOURCE_REVIEW",
 sourceSha:"436874501c4980f5d0fb85a44e72177e77f2e599",
 hostname:"db.internal.example.com",tlsServerName:"db.internal.example.com",
 databasePort:5432,
 verifyCertificateChainRequired:true,verifyHostnameRequired:true,
 rejectUnauthorizedMustBeTrue:true,privateNetworkRequired:true,
 databaseLoginModel:"UNRESOLVED_NOLOGIN",
 callableRole:"pay54_paytag_register_role",
 roleMembershipProvisioned:false,secretProvider:"UNSELECTED",
 credentialGeneration:"NONE",credentialFingerprintSha256:null,
 previousCredentialFingerprintSha256:null,
 oldCredentialRevocationVerified:false,
 connectionCheckoutAttestationRequired:true,transactionLocalRoleRequired:true,
 sessionResetRequired:true,quarantineOnUncertainCommitRequired:true,
 credentialRotationDrillRequired:true,independentDbaApprovalRequired:true,
 independentSecurityApprovalRequired:true,
 connectRequested:false,provisionRequested:false,
 executeMigrationRequested:false,activateRequested:false
});
test("source-only evaluation never grants execution",()=>{
 const result=reviewPay54PayTagConnectionCustody(fixture());
 assert.equal(result.designRequirementsRecorded,true);
 for(const k of [
  "tlsVerificationPerformed","credentialCustodyVerified",
  "credentialRotationPerformed","databaseConnectionEstablished",
  "roleMembershipAuthorised","persistentStagingAuthorised",
  "productionAuthorised","customerRegistrationAuthorised",
  "financialExecutionAuthorised"
 ])assert.equal(result[k],false,k);
 assert.ok(Object.isFrozen(result));
 assert.ok(Object.isFrozen(result.evidenceRequired));
 assert.equal(PAY54_PAYTAG_CONNECTION_CUSTODY_POSTURE.realConnectionCreated,false);
});
for(const [name,override] of [
 ["production",{environment:"PRODUCTION"}],
 ["persistent staging",{environment:"STAGING"}],
 ["loopback IP",{hostname:"127.0.0.1",tlsServerName:"127.0.0.1"}],
 ["hostname spoof",{tlsServerName:"other.internal.example.com"}],
 ["malformed host",{hostname:"db..example.com",tlsServerName:"db..example.com"}],
 ["invalid source hash",{sourceSha:"bad"}],
 ["invalid database port",{databasePort:0}],
 ["disable chain verification",{verifyCertificateChainRequired:false}],
 ["disable hostname verification",{verifyHostnameRequired:false}],
 ["allow insecure TLS",{rejectUnauthorizedMustBeTrue:false}],
 ["public network",{privateNetworkRequired:false}],
 ["pretend database login exists",{databaseLoginModel:"LOGIN"}],
 ["claim role membership",{roleMembershipProvisioned:true}],
 ["select secrets vendor without custody",{secretProvider:"VAULT"}],
 ["claim active credential",{credentialGeneration:"V2"}],
 ["include secret fingerprint",{credentialFingerprintSha256:"a".repeat(64)}],
 ["include prior secret fingerprint",{previousCredentialFingerprintSha256:"b".repeat(64)}],
 ["claim revoked old credential",{oldCredentialRevocationVerified:true}],
 ["omit checkout verification",{connectionCheckoutAttestationRequired:false}],
 ["omit role reset",{sessionResetRequired:false}],
 ["omit unknown commit quarantine",{quarantineOnUncertainCommitRequired:false}],
 ["omit rotation drill",{credentialRotationDrillRequired:false}],
 ["omit DBA review",{independentDbaApprovalRequired:false}],
 ["omit security review",{independentSecurityApprovalRequired:false}],
 ["attempt to connect",{connectRequested:true}],
 ["attempt credential provisioning",{provisionRequested:true}],
 ["attempt migration",{executeMigrationRequested:true}],
 ["attempt customer activation",{activateRequested:true}],
 ["inject password",{password:"not-allowed"}],
 ["inject URI",{databaseUrl:"postgres://example"}]
]){
 test("rejects "+name,()=>assert.throws(
  ()=>reviewPay54PayTagConnectionCustody({...fixture(),...override}),
  /PAY54_PAYTAG_CONNECTION_CUSTODY_REVIEW_DENIED/
 ));
}
test("rejects missing fields and malformed requests",()=>{
 const x=fixture();delete x.privateNetworkRequired;
 assert.throws(()=>reviewPay54PayTagConnectionCustody(x),/PAY54_PAYTAG_CONNECTION_CUSTODY_REVIEW_DENIED/);
 for(const bad of [null,undefined,[],42,"accepted"])assert.throws(
  ()=>reviewPay54PayTagConnectionCustody(bad),
  /PAY54_PAYTAG_CONNECTION_CUSTODY_REVIEW_DENIED/
 );
});
