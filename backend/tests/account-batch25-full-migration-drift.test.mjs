"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {
 verifyPay54MigrationDrift as verify,
 PAY54_BATCH23_MIGRATION_ORDER as legacy,
 PAY54_BATCH25_FULL_MIGRATION_ORDER as all
} from "../governance/pay54-batch23-migration-drift.mjs";

const source=file=>readFileSync(
 new URL("../db/migrations/"+file,import.meta.url));
const fingerprints=files=>Object.fromEntries(files.map(file=>
 [file,createHash("sha256").update(source(file)).digest("hex")]));
test("994: full 001–020 canonical chain is verifiable with independent hashes",()=>{
 const r=verify({
  independentlyReviewedSha256:fingerprints(all),
  requiredMigrations:all
 });
 assert.equal(r.matchingMigrationCount,20);
 assert.equal(r.schema,"pay54.migration-drift-review.v2");
 assert.equal(r.productionReleaseAuthorised,false);
 assert.equal(r.reviewedManifestSignatureNotVerifiedHere,true);
 assert.deepEqual(all.slice(-2),[
  "019_identity_assertion_bootstrap.sql",
  "020_initial_account_binding.sql"
 ]);
});
test("994: original 001–018 migration verifier keeps complete backward compatibility",()=>{
 const r=verify({independentlyReviewedSha256:fingerprints(legacy)});
 assert.equal(r.schema,"pay54.migration-drift-review.v1");
 assert.equal(r.matchingMigrationCount,18);
});
test("994: caller cannot supply arbitrary migration order or partial fingerprint set",()=>{
 assert.throws(()=>verify({
  requiredMigrations:["001_financial_ledger.sql"],
  independentlyReviewedSha256:fingerprints(legacy)
 }),/MIGRATION_DRIFT_DENIED/);
 assert.throws(()=>verify({
  requiredMigrations:[...all],
  independentlyReviewedSha256:fingerprints(all)
 }),/MIGRATION_DRIFT_DENIED/);
 const partial=fingerprints(all);
 delete partial["020_initial_account_binding.sql"];
 assert.throws(()=>verify({
  requiredMigrations:all,independentlyReviewedSha256:partial
 }),/MIGRATION_DRIFT_DENIED/);
});
test("994: tampered first-account binding SQL fails even if older migrations remain",()=>{
 const hashes=fingerprints(all);
 assert.throws(()=>verify({
  requiredMigrations:all,independentlyReviewedSha256:hashes,
  getSource:file=>file==="020_initial_account_binding.sql"
   ? "SELECT 1" : source(file)
 }),/MIGRATION_DRIFT_DENIED/);
});
