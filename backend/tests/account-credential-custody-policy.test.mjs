"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessAccountCredentialCustody} from "../security/account-credential-custody-policy.mjs";

const baseline = Object.freeze({
  schemaVersion: 1,
  tenantId: "11111111-1111-4111-8111-111111111111",
  accountId: "22222222-2222-4222-8222-222222222222",
  roleName: "pay54_tenant_verified_0001",
  environment: "test",
  endpointId: "isolated-test-postgres",
  reviewId: "independent-approval-001",
  rotationEpoch: 1,
  workloadIdentityBound: true,
  tenantScopedSecretAccess: true,
  noCrossTenantSecretAccess: true,
  noProvisioningPrivileges: true,
  tlsPeerVerified: true,
  tlsHostnameVerified: true,
  endpointAllowlisted: true,
  noRoleSwitching: true,
  noPhysicalSessionSharing: true,
  financialPrivilegeAbsent: true,
  customerSelectGrantsAbsent: true,
  independentlyReviewed: true
});

test("item 214: non-secret source evidence is accepted but cannot attest live credentials", () => {
  const result = assessAccountCredentialCustody(baseline);
  assert.equal(result.sourceReviewEligible, true);
  assert.equal(result.liveCredentialAttested, false);
  assert.equal(result.customerDataAccessEnabled, false);
  assert.equal(result.financialExecutionEnabled, false);
  assert.ok(Object.isFrozen(result));
  assert.ok(!JSON.stringify(result).includes("password"));
});

test("item 214: reject missing and downgraded custody assertions individually", () => {
  const flags = [
    "workloadIdentityBound", "tenantScopedSecretAccess",
    "noCrossTenantSecretAccess", "noProvisioningPrivileges",
    "tlsPeerVerified", "tlsHostnameVerified", "endpointAllowlisted",
    "noRoleSwitching", "noPhysicalSessionSharing",
    "financialPrivilegeAbsent", "customerSelectGrantsAbsent",
    "independentlyReviewed"
  ];
  for (const flag of flags) {
    assert.throws(
      () => assessAccountCredentialCustody({...baseline, [flag]: false}),
      /ACCOUNT_CREDENTIAL_CUSTODY_UNTRUSTED/, flag
    );
    const missing = {...baseline};
    delete missing[flag];
    assert.throws(() => assessAccountCredentialCustody(missing),
      /ACCOUNT_CREDENTIAL_CUSTODY_UNTRUSTED/, flag);
  }
});

test("item 214: deny malformed tenant, role, epoch, endpoint and environment", () => {
  for (const patch of [
    {tenantId: "tenant-from-browser"},
    {accountId: "bad"},
    {roleName: "postgres"},
    {roleName: "pay54_tenant_other;SET ROLE postgres"},
    {environment: "local"},
    {endpointId: "host:5432"},
    {rotationEpoch: 0},
    {rotationEpoch: 1.1},
    {reviewId: "x"},
    {schemaVersion: 2},
    {password: "secret"},
    {connectionString: "postgresql://should-not-be-accepted"}
  ]) {
    assert.throws(() => assessAccountCredentialCustody({...baseline, ...patch}),
      /ACCOUNT_CREDENTIAL_CUSTODY_UNTRUSTED/);
  }
});

test("item 214: reject untrusted evidence containers and prototypes", () => {
  for (const invalid of [null, undefined, [], "review", Object.create(null)]) {
    assert.throws(() => assessAccountCredentialCustody(invalid),
      /ACCOUNT_CREDENTIAL_CUSTODY_UNTRUSTED/);
  }
});
