"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { createPay54AccountDirectoryService as createService }
  from "../src/account-directory-service.mjs";

const actor = "11111111-1111-4111-8111-111111111111";
const personal = "22222222-2222-4222-8222-222222222222";
const trustedSession = Object.freeze({ sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", principalId: actor,
  status: "ACTIVE", version: 1, issuedAtMs: 1000, expiresAtMs: 2000 });
const account = {
  accountId: personal, legalOwnerId: actor, type: "PERSONAL",
  displayName: "Personal", status: "ACTIVE", verificationStatus: "VERIFIED"
};
const member = {
  accountId: personal, principalId: actor, role: "PERSONAL_OWNER", status: "ACTIVE"
};

test("771: directory lookup runs only after trusted active session resolution", async () => {
  const calls = [];
  const service = createService({
    getTrustedServerTimeMs: () => 1500,
    resolveAuthenticatedSession: async ctx => {
      calls.push("session:" + ctx.marker);
      return trustedSession;
    },
    loadPrincipalAccountDirectory: async id => {
      calls.push("db:" + id);
      return { accounts: [account], memberships: [member] };
    }
  });
  const result = await service.listAuthorisedAccounts({ marker: "test-only" });
  assert.deepEqual(calls, ["session:test-only", "db:" + actor, "session:test-only"]);
  assert.equal(result.accounts.length, 1);
  assert.equal(result.accounts[0].accountId, personal);
  assert.equal(result.productionReady, false);
});

test("771: anonymous and revoked sessions never invoke repository", async () => {
  for (const value of [null, { ...trustedSession, status: "REVOKED" },
    { ...trustedSession, expiresAtMs: 1500 },
    { status: "ACTIVE" }]) {
    let calls = 0;
    const service = createService({
      getTrustedServerTimeMs: () => 1500,
      resolveAuthenticatedSession: async () => value,
      loadPrincipalAccountDirectory: async () => { calls++; throw Error("should not run"); }
    });
    await assert.rejects(service.listAuthorisedAccounts({}), /SERVICE_UNAVAILABLE/);
    assert.equal(calls, 0);
  }
});

test("771: untrusted repository failure and malformed rows fail closed", async () => {
  for (const reader of [
    async () => { throw new Error("db offline"); },
    async () => ({ accounts: {}, memberships: [] }),
    async () => ({ accounts: [{ ...account, balance: 100 }], memberships: [member] })
  ]) {
    const service = createService({
      getTrustedServerTimeMs: () => 1500,
      resolveAuthenticatedSession: async () => trustedSession,
      loadPrincipalAccountDirectory: reader
    });
    await assert.rejects(service.listAuthorisedAccounts({}), /SERVICE_UNAVAILABLE/);
  }
});

test("771: missing trusted dependencies and session exceptions fail closed", async () => {
  assert.throws(() => createService({}), /SERVICE_UNAVAILABLE/);
  const service = createService({
    getTrustedServerTimeMs: () => 1500,
    resolveAuthenticatedSession: async () => { throw new Error("no token"); },
    loadPrincipalAccountDirectory: async () => ({ accounts: [account], memberships: [member] })
  });
  await assert.rejects(service.listAuthorisedAccounts({}), /SERVICE_UNAVAILABLE/);
});

test("792: session revocation during repository read refuses previously authorised records", async () => {
  let count = 0;
  const service = createService({
    getTrustedServerTimeMs: () => 1500,
    resolveAuthenticatedSession: async () => {
      count++;
      return count === 1 ? trustedSession : { ...trustedSession, status: "REVOKED" };
    },
    loadPrincipalAccountDirectory: async () => ({
      accounts: [account], memberships: [member]
    })
  });
  await assert.rejects(service.listAuthorisedAccounts({}), /SERVICE_UNAVAILABLE/);
  assert.equal(count, 2);
});

test("792: account switch during read refuses stale directory projection", async () => {
  let count = 0;
  const service = createService({
    getTrustedServerTimeMs: () => 1500,
    resolveAuthenticatedSession: async () => {
      count++;
      return count === 1
        ? { ...trustedSession, activeAccountId: personal }
        : { ...trustedSession, activeAccountId: "33333333-3333-4333-8333-333333333333" };
    },
    loadPrincipalAccountDirectory: async () => ({
      accounts: [account], memberships: [member]
    })
  });
  await assert.rejects(service.listAuthorisedAccounts({}), /SERVICE_UNAVAILABLE/);
});
