"use strict";

/**
 * PAY54 CR-PAYTAG-01 P2B-B2B13 — source-only connection/custody policy.
 * Validates a provider-neutral NON-SECRET design description, NOT a real
 * TLS handshake, cloud secret, role assumption, network connection, or grant.
 */
import { isIP } from "node:net";

const DENIED="PAY54_PAYTAG_CONNECTION_CUSTODY_REVIEW_DENIED";
const HOST=/^(?=.{4,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;
const HEX=/^[a-f0-9]{64}$/;
const SHA=/^[a-f0-9]{40}$/;
const exact=(v,keys)=>v!==null&&typeof v==="object"&&!Array.isArray(v)&&
 (Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null)&&
 Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const deny=()=>{throw Error(DENIED);};
const keys=Object.freeze([
 "environment","sourceSha","hostname","tlsServerName","databasePort",
 "verifyCertificateChainRequired","verifyHostnameRequired",
 "rejectUnauthorizedMustBeTrue","privateNetworkRequired",
 "databaseLoginModel","callableRole","roleMembershipProvisioned",
 "secretProvider","credentialGeneration","credentialFingerprintSha256",
 "previousCredentialFingerprintSha256","oldCredentialRevocationVerified",
 "connectionCheckoutAttestationRequired","transactionLocalRoleRequired",
 "sessionResetRequired","quarantineOnUncertainCommitRequired",
 "credentialRotationDrillRequired","independentDbaApprovalRequired",
 "independentSecurityApprovalRequired","connectRequested",
 "provisionRequested","executeMigrationRequested","activateRequested"
]);
export const PAY54_PAYTAG_CONNECTION_CUSTODY_POSTURE=Object.freeze({
 schema:"pay54.paytag.connection-custody-review.v1",
 planningOnly:true,realConnectionCreated:false,tlsHandshakeVerified:false,
 secretRetrieved:false,rotationExecuted:false,roleAssumptionEnabled:false,
 persistentStagingAuthorised:false,productionAuthorised:false,
 financialExecutionAuthorised:false
});

export function reviewPay54PayTagConnectionCustody(input){
 if(!exact(input,keys)||input.environment!=="DISPOSABLE_SOURCE_REVIEW"||
  !SHA.test(input.sourceSha??"")||
  typeof input.hostname!=="string"||!HOST.test(input.hostname)||
  input.hostname.includes("..")||isIP(input.hostname)!==0||
  input.tlsServerName!==input.hostname||
  !Number.isInteger(input.databasePort)||input.databasePort<1||
  input.databasePort>65535||
  input.databaseLoginModel!=="UNRESOLVED_NOLOGIN"||
  input.callableRole!=="pay54_paytag_register_role"||
  input.roleMembershipProvisioned!==false||
  input.secretProvider!=="UNSELECTED"||
  input.credentialGeneration!=="NONE"||
  input.credentialFingerprintSha256!==null||
  input.previousCredentialFingerprintSha256!==null||
  input.oldCredentialRevocationVerified!==false||
  input.connectRequested!==false||input.provisionRequested!==false||
  input.executeMigrationRequested!==false||input.activateRequested!==false)deny();
 for(const k of [
  "verifyCertificateChainRequired","verifyHostnameRequired",
  "rejectUnauthorizedMustBeTrue","privateNetworkRequired",
  "connectionCheckoutAttestationRequired","transactionLocalRoleRequired",
  "sessionResetRequired","quarantineOnUncertainCommitRequired",
  "credentialRotationDrillRequired","independentDbaApprovalRequired",
  "independentSecurityApprovalRequired"
 ]) if(input[k]!==true)deny();
 return Object.freeze({
  schema:"pay54.paytag.connection-custody-evaluation.v1",
  designRequirementsRecorded:true,
  tlsVerificationPerformed:false,
  credentialCustodyVerified:false,
  credentialRotationPerformed:false,
  databaseConnectionEstablished:false,
  roleMembershipAuthorised:false,
  persistentStagingAuthorised:false,
  productionAuthorised:false,
  customerRegistrationAuthorised:false,
  financialExecutionAuthorised:false,
  evidenceRequired:Object.freeze([
   "TARGET_PROVIDER_IAM_AND_POSTGRES_AUTHENTICATION",
   "TLS_CERTIFICATE_CHAIN_AND_HOSTNAME_LIVE_ATTESTATION",
   "SECRET_MANAGER_ACCESS_AND_ROTATION_DRILL",
   "DATABASE_PRINCIPAL_AND_TRANSACTION_POOL_ISOLATION",
   "INDEPENDENT_DBA_SECURITY_RELEASE_APPROVAL"
  ])
 });
}
