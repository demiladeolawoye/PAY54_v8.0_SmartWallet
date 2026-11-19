"use strict";

/**
 * PAY54 Batch 25 / 995 — four-role, twenty-migration staging review packet.
 *
 * Reuses reviewed PostgreSQL/catalogue, SHA256 and Ed25519 source gates.
 * Cryptographic proof that an evidence file was signed does not prove its
 * assertions are true. A human DBA/Security/Founder still must review.
 */
import {probePay54StagingDatabaseRoles,
 probePay54StagingIdentityIssuerRole}
 from "../src/postgres-staging-role-probe.mjs";
import {verifyPay54MigrationDrift,
 PAY54_BATCH25_FULL_MIGRATION_ORDER}
 from "./pay54-batch23-migration-drift.mjs";

const SHA=/^[0-9a-f]{40}$/;
const deny=()=>{throw new Error("PAY54_FOUR_ROLE_STAGING_REVIEW_DENIED");};

export async function reviewPay54FourRoleStagingEvidence({
 expectedCommitSha,signedAttestationVerifier,signedAttestations,
 independentlyReviewedMigrationHashes,
 sessionReadPool,accountReadPool,sessionRotationPool,sessionIssuerPool,
 verifyThreeRoles=probePay54StagingDatabaseRoles,
 verifyIssuerRole=probePay54StagingIdentityIssuerRole,
 verifyMigrationHashes=verifyPay54MigrationDrift
}={}){
 if(!SHA.test(expectedCommitSha??"") ||
    typeof signedAttestationVerifier?.verifyForReview!=="function" ||
    typeof verifyThreeRoles!=="function" ||
    typeof verifyIssuerRole!=="function" ||
    typeof verifyMigrationHashes!=="function" ||
    !sessionReadPool || !accountReadPool ||
    !sessionRotationPool || !sessionIssuerPool ||
    new Set([sessionReadPool,accountReadPool,
     sessionRotationPool,sessionIssuerPool]).size!==4)deny();
 try{
  const signatures=signedAttestationVerifier.verifyForReview({
   expectedCommitSha,attestations:signedAttestations
  });
  if(signatures?.schema!=="pay54.staging-signed-evidence-review.v1" ||
     signatures.expectedCommitSha!==expectedCommitSha ||
     signatures.verifiedCategoryCount!==7 ||
     signatures.distinctReviewerCount<3 ||
     signatures.evidenceSetCompleteForManualReview!==true ||
     signatures.productionDeploymentAuthorised!==false)deny();

  const hashes=verifyMigrationHashes({
   independentlyReviewedSha256:independentlyReviewedMigrationHashes,
   requiredMigrations:PAY54_BATCH25_FULL_MIGRATION_ORDER
  });
  if(hashes?.schema!=="pay54.migration-drift-review.v2" ||
     hashes.matchingMigrationCount!==20 ||
     hashes.sourceHashesMatchReviewedValues!==true ||
     hashes.reviewedManifestSignatureNotVerifiedHere!==true ||
     hashes.productionReleaseAuthorised!==false)deny();

  const original=await verifyThreeRoles({
   sessionReadPool,accountReadPool,sessionRotationPool
  });
  const issuer=await verifyIssuerRole({sessionIssuerPool});
  if(original?.restrictedRolesVerified!==true ||
     original?.productionReleaseAuthorised!==false ||
     issuer?.verifiedRole!=="pay54_session_issue_role" ||
     issuer?.effectiveFunctionOnlyRoleVerified!==true ||
     issuer?.productionReleaseAuthorised!==false)deny();

  return Object.freeze({
   schema:"pay54.four-role-twenty-migration-staging-review.v1",
   expectedCommitSha,
   signedEvidenceCategoryCount:7,
   reviewedSourceMigrationCount:20,
   inspectedEffectivePostgresRoleCount:4,
   manualDBAAndSecurityReviewStillRequired:true,
   sourceOnlyEvidenceIsNotCloudAttestation:true,
   authorisedToProvisionStaging:false,
   authorisedToActivateCustomerSessions:false,
   productionDeploymentAuthorised:false
  });
 }catch{deny();}
}
