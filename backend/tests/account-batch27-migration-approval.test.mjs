"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54MigrationChangeRequest as assess}
 from "../governance/pay54-batch27-migration-approval.mjs";
const good={sourceSha:"a".repeat(40),requestedMigrationCount:20,
 reviewedSqlSha256:"b".repeat(64),backupRestoreEvidenceSha256:"c".repeat(64),
 changeTicket:"PAY54-DB-2026",executedOnRealDatabase:false};
test("1100: migration planning cannot execute DB changes or claim backup",()=>{
 const r=assess(good);
 assert.equal(r.databaseMigrationExecuted,false);
 assert.equal(r.restoredBackupIndependentlyWitnessed,false);
});
test("1100: partial migrations, missing restore and unsupported change ticket denied",()=>{
 for(const x of [{requestedMigrationCount:18},
  {backupRestoreEvidenceSha256:"missing"},
  {changeTicket:"none"},
  {executedOnRealDatabase:true}])
 assert.throws(()=>assess({...good,...x}),
 /MIGRATION_CHANGE_APPROVAL_DENIED/);
});
