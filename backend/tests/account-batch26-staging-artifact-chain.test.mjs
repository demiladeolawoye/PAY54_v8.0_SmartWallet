"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54StagingLineage as inspect}
 from "../governance/pay54-batch26-staging-artifact-chain.mjs";
const sha="a".repeat(40),digest="sha256:"+"b".repeat(64);
const x={sourceSha:sha,reviewedSourceSha:sha,
 containerDigest:digest,reviewedContainerDigest:digest,
 migrationCount:20,reviewedMigrationCount:20};
test("1040: matching staging lineage is only a candidate, not running proof",()=>{
 const r=inspect(x);
 assert.equal(r.canonicalMigrationCount,20);
 assert.equal(r.actualDatabaseSchemaVersionVerified,false);
 assert.equal(r.stagingDeploymentAuthorised,false);
});
test("1040: wrong source, container digest or partial SQL chain denied",()=>{
 for(const y of [{reviewedSourceSha:"c".repeat(40)},
  {reviewedContainerDigest:"sha256:"+"d".repeat(64)},
  {migrationCount:18},{containerDigest:"latest"}])
 assert.throws(()=>inspect({...x,...y}),/STAGING_LINEAGE_DENIED/);
});
