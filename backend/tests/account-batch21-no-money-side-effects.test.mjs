"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { planPay54AccountSwitchAdmission }
  from "../domain/account-switch-admission.mjs";
import { planPay54AccountWalletRead }
  from "../domain/account-wallet-read-admission.mjs";

const actor = "11111111-1111-4111-8111-111111111111";
const personal = "22222222-2222-4222-8222-222222222222";
const business = "33333333-3333-4333-8333-333333333333";
const session = {
  sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  principalId: actor, status: "ACTIVE", version: 4,
  activeAccountId: personal, issuedAtMs: 1000, expiresAtMs: 5000
};
const account = {
  accountId: personal, legalOwnerId: actor, type: "PERSONAL",
  displayName: "Personal", status: "ACTIVE", verificationStatus: "VERIFIED"
};
const membership = {
  accountId: personal, principalId: actor,
  role: "PERSONAL_OWNER", status: "ACTIVE"
};

test("813: account wallet read plan never mutates trusted source objects", () => {
  const wallet = { id: "44444444-4444-4444-8444-444444444444", accountId: personal };
  const source = { sessionFromTrustedAuthority: session, accountFromTrustedStore: account,
    membershipFromTrustedStore: membership, serverTimeMs: 2000,
    walletFromTrustedStore: wallet };
  const before = JSON.stringify(source);
  const result = planPay54AccountWalletRead(source);
  assert.equal(JSON.stringify(source), before);
  assert.equal(result.walletReadExecuted, false);
  assert.equal(result.financialExecutionAuthorised, false);
});

test("813: Business selection admission never changes active session or issues a token", () => {
  const token = randomBytes(32).toString("base64url");
  const businessAccount = {
    ...account, accountId: business, type: "BUSINESS", displayName: "Shop"
  };
  const businessMember = {
    ...membership, accountId: business, role: "BUSINESS_OWNER"
  };
  const input = {
    untrustedRequestPayload: { requestedAccountId: business },
    trustedApplicationOrigin: "https://wallet.example",
    requestOrigin: "https://wallet.example",
    csrfFromTrustedSession: token,
    csrfPresentedByRequest: token,
    currentSessionFromTrustedStore: session,
    accountFromTrustedStore: businessAccount,
    membershipFromTrustedStore: businessMember,
    authoritativeSessionVersion: 4,
    serverTimeMs: 2000
  };
  const before = JSON.stringify(input);
  const result = planPay54AccountSwitchAdmission(input);
  assert.equal(JSON.stringify(input), before);
  assert.equal(session.activeAccountId, personal);
  assert.equal(result.switchExecuted, false);
  assert.equal(result.productionReady, false);
  assert.equal(Object.hasOwn(result, "token"), false);
  assert.equal(Object.hasOwn(result, "csrfFromTrustedSession"), false);
});
