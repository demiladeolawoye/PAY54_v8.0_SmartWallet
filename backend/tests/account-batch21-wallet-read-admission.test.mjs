"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { planPay54AccountWalletRead as plan }
  from "../domain/account-wallet-read-admission.mjs";

const actor = "11111111-1111-4111-8111-111111111111";
const personal = "22222222-2222-4222-8222-222222222222";
const other = "33333333-3333-4333-8333-333333333333";
const walletId = "44444444-4444-4444-8444-444444444444";
const journalId = "55555555-5555-4555-8555-555555555555";
const input = {
  sessionFromTrustedAuthority: {
    sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    principalId: actor, status: "ACTIVE", version: 3,
    issuedAtMs: 1000, expiresAtMs: 5000,
    activeAccountId: personal
  },
  accountFromTrustedStore: {
    accountId: personal, legalOwnerId: actor, type: "PERSONAL",
    displayName: "Personal", status: "ACTIVE", verificationStatus: "VERIFIED"
  },
  membershipFromTrustedStore: {
    accountId: personal, principalId: actor,
    role: "PERSONAL_OWNER", status: "ACTIVE"
  },
  serverTimeMs: 2000,
  walletFromTrustedStore: { id: walletId, accountId: personal },
  journalFromTrustedStore: { id: journalId, accountId: personal }
};

test("797: verified session/account/wallet/journal yields nonexecuting admission", () => {
  const result = plan(input);
  assert.equal(result.accountId, personal);
  assert.equal(result.walletId, walletId);
  assert.equal(result.journalId, journalId);
  assert.equal(result.walletReadExecuted, false);
  assert.equal(result.financialExecutionAuthorised, false);
  assert.ok(Object.isFrozen(result));
});

test("797: wrong wallet or journal account fails before any financial read", () => {
  for (const candidate of [
    { walletFromTrustedStore: { id: walletId, accountId: other } },
    { journalFromTrustedStore: { id: journalId, accountId: other } },
    { sessionFromTrustedAuthority: {
      ...input.sessionFromTrustedAuthority, activeAccountId: other
    } },
    { membershipFromTrustedStore: {
      ...input.membershipFromTrustedStore, status: "REVOKED"
    } },
    { walletFromTrustedStore: null },
    { journalFromTrustedStore: { id: "forged", accountId: personal } }
  ]) assert.throws(() => plan({ ...input, ...candidate }), /WALLET_READ_ADMISSION_DENIED/);
});

test("797: journal can be absent for wallet-only read; payment is still forbidden", () => {
  const result = plan({ ...input, journalFromTrustedStore: null });
  assert.equal(result.journalId, null);
  assert.equal(result.financialExecutionAuthorised, false);
  assert.equal(result.walletReadExecuted, false);
});
