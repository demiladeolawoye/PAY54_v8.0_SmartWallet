"use strict";
/** Batch26/1039 — freeze staging source+SQL+container lineage for review. */
const SHA=/^[a-f0-9]{40}$/;
const DIGEST=/^sha256:[a-f0-9]{64}$/;
const deny=()=>{throw Error("PAY54_STAGING_LINEAGE_DENIED");};
export function inspectPay54StagingLineage({
 sourceSha,reviewedSourceSha,containerDigest,
 reviewedContainerDigest,migrationCount,
 reviewedMigrationCount
}={}){
 if(!SHA.test(sourceSha??"")||sourceSha!==reviewedSourceSha ||
    !DIGEST.test(containerDigest??"") ||
    containerDigest!==reviewedContainerDigest ||
    migrationCount!==20 || reviewedMigrationCount!==20)deny();
 return Object.freeze({
  schema:"pay54.staging-source-container-migration-lineage-v1",
  sourceSha,sourceContainerMatchClaimed:true,
  canonicalMigrationCount:20,
  containerDigestStructurallyValid:true,
  signedBuildProvenanceIndependentlyVerified:false,
  runningContainerImageIndependentlyVerified:false,
  actualDatabaseSchemaVersionVerified:false,
  stagingDeploymentAuthorised:false
 });
}
