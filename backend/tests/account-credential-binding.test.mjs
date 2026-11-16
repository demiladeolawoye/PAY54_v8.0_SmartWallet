"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {createAccountCredentialBinding} from "../security/account-credential-binding.mjs";

const SUBJECT = "11111111-1111-4111-8111-111111111111";
const TENANT = "22222222-2222-4222-8222-222222222222";
const ACCOUNT = "33333333-3333-4333-8333-333333333333";
const ROLE = "pay54_tenant_verified_0001";
const EVIDENCE = Object.freeze({
  schemaVersion: 1, tenantId: TENANT, accountId: ACCOUNT,
  roleName: ROLE, environment: "test",
  endpointId: "isolated-test-postgres", reviewId: "independent-approval-001",
  rotationEpoch: 2,
  workloadIdentityBound: true, tenantScopedSecretAccess: true,
  noCrossTenantSecretAccess: true, noProvisioningPrivileges: true,
  tlsPeerVerified: true, tlsHostnameVerified: true,
  endpointAllowlisted: true, noRoleSwitching: true,
  noPhysicalSessionSharing: true, financialPrivilegeAbsent: true,
  customerSelectGrantsAbsent: true, independentlyReviewed: true
});

async function principal() {
  const resolver = createTrustedAccountPrincipalResolver({
    verifyServerSession: async () => ({
      subjectId: SUBJECT, authenticated: true, revoked: false,
      expiresAt: Math.floor(Date.now() / 1000) + 60
    })
  });
  const signed = await resolver.resolve({});
  return createAccountDbPrincipal({
    principal: signed, roleName: ROLE,
    assertRoleMapping: (id, role) => id === SUBJECT && role === ROLE
  });
}
const mapping = () => ({
  subjectId: SUBJECT, accountId: ACCOUNT, tenantId: TENANT,
  roleName: ROLE, active: true, revoked: false, rotationEpoch: 2
});

test("item 216: current mapping, exact credential role and epoch yield inert binding", async () => {
  const verifier = createAccountCredentialBinding({
    loadAuthoritativeBinding: async () => mapping()
  });
  const result = await verifier.verify({
    dbPrincipal: await principal(), custodyEvidence: EVIDENCE,
    accountId: ACCOUNT, tenantId: TENANT
  });
  assert.equal(result.sourceMappingEligible, true);
  assert.equal(result.liveCredentialAttested, false);
  assert.equal(result.customerDataAccessEnabled, false);
  assert.equal(result.financialExecutionEnabled, false);
  assert.ok(Object.isFrozen(result));
});

test("item 216: reject spoofed, stale, revoked, cross-tenant and cross-account mapping", async () => {
  const dbPrincipal = await principal();
  const expected = {dbPrincipal, custodyEvidence: EVIDENCE,
    accountId: ACCOUNT, tenantId: TENANT};
  for (const mutation of [
    {subjectId: TENANT}, {accountId: TENANT}, {tenantId: ACCOUNT},
    {roleName: "pay54_tenant_other_0001"}, {rotationEpoch: 1},
    {active: false}, {revoked: true}
  ]) {
    const verifier = createAccountCredentialBinding({
      loadAuthoritativeBinding: async () => ({...mapping(), ...mutation})
    });
    await assert.rejects(() => verifier.verify(expected),
      /ACCOUNT_CREDENTIAL_BINDING_DENIED/);
  }
  const verifier = createAccountCredentialBinding({
    loadAuthoritativeBinding: async () => mapping()
  });
  for (const changed of [
    {accountId: TENANT}, {tenantId: ACCOUNT},
    {dbPrincipal: {principalId: SUBJECT, roleName: ROLE}},
    {custodyEvidence: {...EVIDENCE, rotationEpoch: 0}}
  ]) {
    await assert.rejects(() => verifier.verify({...expected, ...changed}),
      /ACCOUNT_CREDENTIAL_BINDING_DENIED|DB_PRINCIPAL_DENIED|ACCOUNT_CREDENTIAL_CUSTODY_UNTRUSTED/);
  }
});

test("item 216: reject missing mapping, missing reviewer and reviewer outage", async () => {
  assert.throws(() => createAccountCredentialBinding({}),
    /ACCOUNT_CREDENTIAL_MAPPING_REQUIRED/);
  const dbPrincipal = await principal();
  for (const callback of [
    async () => null, async () => {throw new Error("STORE_UNAVAILABLE");}
  ]) {
    const verifier = createAccountCredentialBinding({
      loadAuthoritativeBinding: callback
    });
    await assert.rejects(() => verifier.verify({
      dbPrincipal, custodyEvidence: EVIDENCE,
      accountId: ACCOUNT, tenantId: TENANT
    }));
  }
});
