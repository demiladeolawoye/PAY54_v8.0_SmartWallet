"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { assessPayTagRuntimeActivation } from
  "../governance/paytag-runtime-activation-gate.mjs";

const base = () => ({
  repository: "demiladeolawoye/PAY54_v8.0_SmartWallet",
  branch: "project-titan",
  sourceSha: "1d74fcd8ee289a68333dca46ec70ded9353556ca",
  migrationFilename: "028_paytag_restricted_execution.sql",
  migrationSha256: "a".repeat(64),
  changeTicket: "PAY54-DB-1001",
  environment: "DISPOSABLE_REVIEW",
  independentReviewVerified: true,
  exactHeadCiVerified: true,
  backupRestoreWitnessed: true,
  rollbackDrillWitnessed: true,
  iamNoLoginProven: true,
  roleMembershipAuditProven: true,
  roleAclAuditProven: true,
  defaultPrivilegesAuditProven: true,
  rlsAuditProven: true,
  credentialStorageApproved: true,
  rotationDrillWitnessed: true,
  databaseConnectionAttested: true,
  requestedMigrationExecution: false,
  requestedRuntimeActivation: false,
  requestedFinancialActivation: false
});

test("complete attestation is still never deployment authorisation", () => {
  const result = assessPayTagRuntimeActivation(base());
  assert.equal(result.migrationExecutionAuthorised,false);
  assert.equal(result.runtimeActivationAuthorised,false);
  assert.equal(result.financialActivationAuthorised,false);
  assert.equal(result.persistentStagingAuthorised,false);
  assert.equal(result.productionAuthorised,false);
  assert.equal(result.evidenceClaimsNotIndependentlyValidated,true);
  assert.equal(Object.isFrozen(result),true);
});

test("missing attestation stays explicitly pending and never authorises", () => {
  const r = base();
  r.rlsAuditProven = false;
  r.rotationDrillWitnessed = false;
  const result = assessPayTagRuntimeActivation(r);
  assert.deepEqual(result.unmetEvidenceClaims,
    ["rlsAuditProven","rotationDrillWitnessed"]);
  assert.equal(result.runtimeActivationAuthorised,false);
});

for (const [name, patch] of [
  ["production environment", {environment:"PRODUCTION"}],
  ["staging environment", {environment:"STAGING"}],
  ["runtime enable request", {requestedRuntimeActivation:true}],
  ["migration execute request", {requestedMigrationExecution:true}],
  ["financial enable request", {requestedFinancialActivation:true}],
  ["untrusted repo", {repository:"other/repo"}],
  ["untrusted branch", {branch:"main"}],
  ["wrong migration", {migrationFilename:"029_changed.sql"}],
  ["invalid source SHA", {sourceSha:"0"}],
  ["invalid SQL digest", {migrationSha256:"0"}],
  ["invalid change ticket", {changeTicket:"none"}],
  ["nonboolean attestation", {rlsAuditProven:"true"}],
  ["extra override field", {allowDeployment:true}]
]) {
 test("fail closed: "+name, () => {
  assert.throws(() => assessPayTagRuntimeActivation({...base(),...patch}),
    /PAY54_PAYTAG_RUNTIME_ACTIVATION_DENIED/);
 });
}
test("rejects missing fields and non-record inputs", () => {
  const missing = base();
  delete missing.databaseConnectionAttested;
  assert.throws(() => assessPayTagRuntimeActivation(missing),
    /PAY54_PAYTAG_RUNTIME_ACTIVATION_DENIED/);
  for(const input of [null,undefined,[],42,"enabled"]) {
    assert.throws(() => assessPayTagRuntimeActivation(input),
      /PAY54_PAYTAG_RUNTIME_ACTIVATION_DENIED/);
  }
});
