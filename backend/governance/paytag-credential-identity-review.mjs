"use strict";

/**
 * PAY54 CR-PAYTAG-01 / PR63 — source-only database identity/custody gate.
 *
 * This validates a NON-SECRET, hypothetical review description. It does not
 * connect to PostgreSQL, authenticate a service, fetch secrets, assume roles,
 * provision resources, or approve staging/production access.
 */
const DENIED = "PAY54_PAYTAG_CREDENTIAL_IDENTITY_REVIEW_DENIED";
const EXPECTED_REPOSITORY = "demiladeolawoye/PAY54_v8.0_SmartWallet";
const EXPECTED_BRANCH = "project-titan";
const EXPECTED_ROLE = "pay54_paytag_register_role";
const EXPECTED_OWNER = "pay54_paytag_function_owner_role";
const SHA = /^[a-f0-9]{40}$/;
const HASH = /^[a-f0-9]{64}$/;
const REVIEW = /^PAY54-SEC-[1-9][0-9]{3,10}$/;
const fields = Object.freeze([
  "repository","branch","sourceSha","migrationSha256","reviewTicket",
  "environment","callerRole","functionOwnerRole","runtimeIdentityModel",
  "cloudProvider","secretCustodyModel","credentialRotationModel",
  "databaseTlsModel","privateConnectivityRequired","backendAuthenticationRequired",
  "backendRequestAttestationRequired","leastPrivilegeDatabaseRoleRequired",
  "noDirectFinancialPrivilegesRequired","noPublicIngressRequired",
  "sessionResetOrDiscardRequired","auditedCredentialRotationRequired",
  "independentDbaApprovalRequired","independentSecurityApprovalRequired",
  "deployRequested","credentialProvisionRequested","runtimeRequested"
]);
const exact = value => value !== null &&
  typeof value === "object" && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype ||
   Object.getPrototypeOf(value) === null) &&
  Object.keys(value).length === fields.length &&
  fields.every(f => Object.hasOwn(value,f));
const deny = () => { throw new Error(DENIED); };

export const PAY54_PAYTAG_IDENTITY_REVIEW_POSTURE = Object.freeze({
  schema:"pay54.paytag-identity-review.v1",
  planningOnly:true,
  credentialAccessEnabled:false,
  roleAssumptionEnabled:false,
  stagingProvisioningEnabled:false,
  productionProvisioningEnabled:false,
  customerRegistrationEnabled:false,
  financialExecutionEnabled:false
});

/**
 * A source-review contract; all "required" values must be explicitly true.
 * Never interpret success here as an attestation that controls actually exist.
 * A NOLOGIN PostgreSQL role cannot log in directly; the role-assumption
 * mechanism remains unresolved and therefore must not be represented as live.
 */
export function assessPay54PayTagCredentialIdentityReview(request){
  if(!exact(request) ||
     request.repository!==EXPECTED_REPOSITORY ||
     request.branch!==EXPECTED_BRANCH ||
     !SHA.test(request.sourceSha) ||
     !HASH.test(request.migrationSha256) ||
     !REVIEW.test(request.reviewTicket) ||
     request.environment!=="DISPOSABLE_REVIEW" ||
     request.callerRole!==EXPECTED_ROLE ||
     request.functionOwnerRole!==EXPECTED_OWNER ||
     request.runtimeIdentityModel!=="UNRESOLVED_NOLOGIN" ||
     request.cloudProvider!=="UNSELECTED" ||
     request.secretCustodyModel!=="NOT_PROVISIONED" ||
     request.credentialRotationModel!=="NOT_PROVISIONED" ||
     request.databaseTlsModel!=="NOT_ATTESTED" ||
     request.deployRequested!==false ||
     request.credentialProvisionRequested!==false ||
     request.runtimeRequested!==false)deny();
  for(const field of [
    "privateConnectivityRequired",
    "backendAuthenticationRequired",
    "backendRequestAttestationRequired",
    "leastPrivilegeDatabaseRoleRequired",
    "noDirectFinancialPrivilegesRequired",
    "noPublicIngressRequired",
    "sessionResetOrDiscardRequired",
    "auditedCredentialRotationRequired",
    "independentDbaApprovalRequired",
    "independentSecurityApprovalRequired"
  ]) if(request[field]!==true)deny();

  return Object.freeze({
    schema:"pay54.paytag-credential-identity-review-result.v1",
    requirementShapesValidated:true,
    independentEvidenceVerified:false,
    databasePrincipalValidated:false,
    databaseLoginIdentityEstablished:false,
    tlsConnectionVerified:false,
    secretManagerConnected:false,
    credentialIssued:false,
    rotationPerformed:false,
    roleAssumptionApproved:false,
    realDatabaseConnected:false,
    migrationExecutionAuthorised:false,
    persistentStagingAuthorised:false,
    productionAuthorised:false,
    customerRegistrationAuthorised:false,
    financialExecutionAuthorised:false,
    unresolvedBlockers:Object.freeze([
      "NOLOGIN_CALLER_ROLE_HAS_NO_APPROVED_ASSUMPTION_PATH",
      "DATABASE_AND_CLOUD_PROVIDER_NOT_SELECTED_OR_ATTESTED",
      "IDENTITY_AND_SECRET_CUSTODY_NOT_PROVISIONED",
      "INDEPENDENT_DBA_AND_SECURITY_RELEASE_APPROVAL_OUTSTANDING"
    ])
  });
}
