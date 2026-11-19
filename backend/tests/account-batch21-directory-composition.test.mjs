"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { createPay54AccountDirectoryComposition as compose }
  from "../src/account-directory-composition.mjs";

const principal = "11111111-1111-4111-8111-111111111111";
const other = "99999999-9999-4999-8999-999999999999";
const accountId = "22222222-2222-4222-8222-222222222222";
const account = { accountId, legalOwnerId: principal, type: "PERSONAL",
  displayName: "Personal Wallet", status: "ACTIVE", verificationStatus: "VERIFIED" };
const member = { accountId, principalId: principal, role: "PERSONAL_OWNER", status: "ACTIVE" };
const active = { sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  principalId: principal, status: "ACTIVE", version: 2,
  issuedAtMs: 1000, expiresAtMs: 2000 };

test("783: end-to-end composition exposes verified personal view without switching accounts", async () => {
  const calls = [];
  const service = compose({
    resolveAuthenticatedSession: async () => { calls.push("auth"); return active; },
    getTrustedServerTimeMs: () => 1500,
    withScopedReadTransaction: async (actor, callback) => {
      calls.push("scope:" + actor);
      return callback({
        actorId: actor, readOnly: true, rlsEnforced: true,
        listAccounts: async () => { calls.push("accounts"); return [account]; },
        listMemberships: async () => { calls.push("membership"); return [member]; }
      });
    }
  });
  const result = await service.listAuthorisedAccounts({});
  assert.deepEqual(calls, ["auth", "scope:" + principal, "accounts", "membership", "auth"]);
  assert.equal(result.accounts.length, 1);
  assert.equal(result.accounts[0].accountId, accountId);
  assert.equal(result.accounts[0].financialOperationAuthorised, false);
  assert.equal(result.accountSwitchCompleted, false);
});

test("783: wrong principal tenant and revoked session refuse account discovery", async () => {
  for (const session of [active, { ...active, status: "REVOKED" }]) {
    let accountReads = 0;
    const service = compose({
      resolveAuthenticatedSession: async () => session,
      getTrustedServerTimeMs: () => 1500,
      withScopedReadTransaction: async (actor, callback) => {
        return callback({
          actorId: other, readOnly: true, rlsEnforced: true,
          listAccounts: async () => { accountReads++; return [account]; },
          listMemberships: async () => [member]
        });
      }
    });
    await assert.rejects(service.listAuthorisedAccounts({}), /SERVICE_UNAVAILABLE/);
    assert.equal(accountReads, 0);
  }
});

test("783: no trusted database transaction port means composition cannot be created", () => {
  assert.throws(() => compose({
    resolveAuthenticatedSession: async () => active,
    getTrustedServerTimeMs: () => 1500
  }), /SCOPED_DIRECTORY_UNAVAILABLE/);
});
