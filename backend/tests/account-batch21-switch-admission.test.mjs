"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { planPay54AccountSwitchAdmission as plan }
  from "../domain/account-switch-admission.mjs";

const actor = "11111111-1111-4111-8111-111111111111";
const oldAccount = "22222222-2222-4222-8222-222222222222";
const business = "33333333-3333-4333-8333-333333333333";
const token = randomBytes(32).toString("base64url");
const session = {
  sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  principalId: actor, activeAccountId: oldAccount,
  version: 7, status: "ACTIVE", issuedAtMs: 1000, expiresAtMs: 5000
};
const data = {
  untrustedRequestPayload: { requestedAccountId: business },
  trustedApplicationOrigin: "https://wallet.example",
  requestOrigin: "https://wallet.example",
  csrfFromTrustedSession: token,
  csrfPresentedByRequest: token,
  currentSessionFromTrustedStore: session,
  accountFromTrustedStore: {
    accountId: business, legalOwnerId: actor,
    type: "BUSINESS", displayName: "My Shop",
    status: "ACTIVE", verificationStatus: "VERIFIED"
  },
  membershipFromTrustedStore: {
    accountId: business, principalId: actor,
    role: "BUSINESS_OWNER", status: "ACTIVE"
  },
  authoritativeSessionVersion: 7,
  serverTimeMs: 2000
};
test("805: complete trusted inputs yield an immutable nonexecuting switch admission", () => {
  const result = plan(data);
  assert.equal(result.requestedAccountId, business);
  assert.equal(result.expectedSessionVersion, 7);
  assert.equal(result.switchExecuted, false);
  assert.equal(result.financialExecutionAuthorised, false);
  assert.equal(result.requiresAtomicOneTimeReplayFence, true);
  assert.ok(Object.isFrozen(result));
});
test("805: replay/stale session, revoked member, bad CSRF and same-account switch deny", () => {
  for (const mutation of [
    { authoritativeSessionVersion: 8 },
    { csrfPresentedByRequest: randomBytes(32).toString("base64url") },
    { requestOrigin: "https://attacker.example" },
    { currentSessionFromTrustedStore: { ...session, status: "REVOKED" } },
    { membershipFromTrustedStore: { ...data.membershipFromTrustedStore, status: "REVOKED" } },
    { membershipFromTrustedStore: { ...data.membershipFromTrustedStore, principalId: oldAccount } },
    { currentSessionFromTrustedStore: { ...session, activeAccountId: business } },
    { untrustedRequestPayload: { requestedAccountId: business, role: "BUSINESS_OWNER" } }
  ]) assert.throws(() => plan({ ...data, ...mutation }), /SWITCH_ADMISSION_DENIED/);
});
