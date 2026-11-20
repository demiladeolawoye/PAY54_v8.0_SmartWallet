"use strict";
/** Batch27/1099 — DBA migration preflight accepts no partial chain or future drift. */
const HASH=/^[a-f0-9]{64}$/;
const SHA=/^[a-f0-9]{40}$/;
const deny=()=>{throw Error("PAY54_MIGRATION_CHANGE_APPROVAL_DENIED");};
export function assessPay54MigrationChangeRequest({
 sourceSha,requestedMigrationCount,reviewedSqlSha256,
 backupRestoreEvidenceSha256,changeTicket,
 executedOnRealDatabase
}={}){
 if(!SHA.test(sourceSha??"")||requestedMigrationCount!==20 ||
    !HASH.test(reviewedSqlSha256??"")||
    !HASH.test(backupRestoreEvidenceSha256??"")||
    typeof changeTicket!=="string" ||
    !/^PAY54-DB-[1-9][0-9]{3,10}$/.test(changeTicket) ||
    executedOnRealDatabase!==false)deny();
 return Object.freeze({
  schema:"pay54.postgres-migration-change-review.v1",
  sourceSha,canonicalMigrationCount:20,
  operatorTicket:changeTicket,
  restoredBackupIndependentlyWitnessed:false,
  actualMigrationByteHashesMatched:false,
  databaseMigrationExecuted:false,
  stagingProvisioningAuthorised:false,
  productionReleaseAuthorised:false
 });
}
