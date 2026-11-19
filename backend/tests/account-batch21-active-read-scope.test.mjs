"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { planPay54ActiveAccountRead as plan }
  from "../domain/account-active-read-scope.mjs";

const actor = "11111111-1111-4111-8111-111111111111";
const other = "99999999-9999-4999-8999-999999999999";
const personal = "22222222-2222-4222-8222-222222222222";
const business = "33333333-3333-4333-8333-333333333333";
const session = {
  sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  principalId: actor, activeAccountId: personal, status: "ACTIVE",
  version: 5, issuedAtMs: 1000, expiresAtMs: 9000
};
const account = {
  accountId: personal, legalOwnerId: actor,
  displayName: "My Personal Wallet", type: "PERSONAL",
  status: "ACTIVE", verificationStatus: "VERIFIED"
};
const membership = {
  accountId: personal, principalId: actor,
  role: "PERSONAL_OWNER", status: "ACTIVE"
};
const check = (overrides = {}) => plan({
  sessionFromTrustedAuthority: session,
  accountFromTrustedStore: account,
  membershipFromTrustedStore: membership,
  serverTimeMs: 2000,
  ...overrides
});

test("795: authenticated active account permits only a nonexecuting scoped read plan", () => {
  const result = check();
  assert.equal(result.accountId, personal);
  assert.equal(result.sessionVersion, 5);
  assert.equal(result.readExecuted, false);
  assert.equal(result.financialExecutionAuthorised, false);
  assert.equal(result.requiresRlsBoundRead, true);
  assert.ok(Object.isFrozen(result));
});

test("795: forged browser target, wrong member, expired session and ownership denial", () => {
  const mutations = [
    { sessionFromTrustedAuthority: { ...session, activeAccountId: business } },
    { sessionFromTrustedAuthority: { ...session, activeAccountId: null } },
    { sessionFromTrustedAuthority: { ...session, status: "REVOKED" } },
    { sessionFromTrustedAuthority: { ...session, expiresAtMs: 2000 } },
    { sessionFromTrustedAuthority: { ...session, principalId: other } },
    { accountFromTrustedStore: { ...account, accountId: business } },
    { accountFromTrustedStore: { ...account, legalOwnerId: other } },
    { membershipFromTrustedStore: { ...membership, principalId: other } },
    { membershipFromTrustedStore: { ...membership, status: "SUSPENDED" } },
    { membershipFromTrustedStore: { ...membership, role: "BUSINESS_VIEWER" } },
    { accountFromTrustedStore: { ...account, status: "CLOSED" } },
    { accountFromTrustedStore: { ...account, verificationStatus: "REJECTED" } }
  ];
  for (const input of mutations)
    assert.throws(() => check(input), /ACTIVE_ACCOUNT_READ_DENIED/);
});

test("795: business viewer can read authorised active business but not initiate money movement", () => {
  const result = check({
    sessionFromTrustedAuthority: { ...session, activeAccountId: business },
    accountFromTrustedStore: {
      ...account, accountId: business, legalOwnerId: other,
      type: "BUSINESS", displayName: "Authorised Business"
    },
    membershipFromTrustedStore: {
      ...membership, accountId: business, role: "BUSINESS_VIEWER"
    }
  });
  assert.equal(result.accountId, business);
  assert.equal(result.financialExecutionAuthorised, false);
  assert.equal(result.readExecuted, false);
});
