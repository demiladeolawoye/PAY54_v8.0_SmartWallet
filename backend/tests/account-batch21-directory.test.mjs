"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { projectPay54AuthorisedAccountDirectory as project }
  from "../domain/account-context-directory.mjs";

const actor = "11111111-1111-4111-8111-111111111111";
const other = "99999999-9999-4999-8999-999999999999";
const personal = "22222222-2222-4222-8222-222222222222";
const business = "33333333-3333-4333-8333-333333333333";
const stranger = "44444444-4444-4444-8444-444444444444";
const account = (accountId, type, legalOwnerId = actor, status = "ACTIVE") => ({
  accountId, legalOwnerId, type, displayName: type === "PERSONAL" ? "My Wallet" : "My Company",
  status, verificationStatus: "VERIFIED"
});
const membership = (accountId, principalId, role, status = "ACTIVE") => ({
  accountId, principalId, role, status
});
const records = () => ({
  authenticatedPrincipalId: actor,
  accountsFromTrustedStore: [
    account(personal, "PERSONAL"),
    account(business, "BUSINESS", other),
    account(stranger, "PERSONAL", other)
  ],
  membershipsFromTrustedStore: [
    membership(personal, actor, "PERSONAL_OWNER"),
    membership(business, actor, "BUSINESS_VIEWER"),
    membership(stranger, other, "PERSONAL_OWNER")
  ]
});

test("769: only authenticated actor memberships are visible; viewer never gains payment authority", () => {
  const response = project(records());
  assert.deepEqual(response.accounts.map(a => a.accountId), [business, personal]);
  assert.deepEqual(response.accounts.map(a => a.accountType), ["BUSINESS", "PERSONAL"]);
  assert.ok(response.accounts.every(a => a.financialOperationAuthorised === false));
  assert.equal(response.accountSwitchCompleted, false);
  assert.equal(response.productionReady, false);
  assert.equal(response.requiresAuthoritativeDatabaseRls, true);
  assert.ok(Object.isFrozen(response));
  assert.ok(Object.isFrozen(response.accounts));
  assert.ok(response.accounts.every(Object.isFrozen));
  assert.equal(JSON.stringify(response).includes(stranger), false);
  assert.equal(JSON.stringify(response).includes(other), false);
});

test("769: invalid principal, non-arrays, extra fields and duplicated rows fail closed", () => {
  const base = records();
  for (const input of [
    { ...base, authenticatedPrincipalId: "browser-user" },
    { ...base, accountsFromTrustedStore: {} },
    { ...base, membershipsFromTrustedStore: null },
    { ...base, accountsFromTrustedStore: [...base.accountsFromTrustedStore, base.accountsFromTrustedStore[0]] },
    { ...base, membershipsFromTrustedStore: [...base.membershipsFromTrustedStore, base.membershipsFromTrustedStore[0]] },
    { ...base, accountsFromTrustedStore: [
      { ...base.accountsFromTrustedStore[0], balance: 999 }, ...base.accountsFromTrustedStore.slice(1)
    ] }
  ]) assert.throws(() => project(input), /DIRECTORY_ACCESS_DENIED/);
});

test("769: revoked, suspended and unauthorised memberships do not leak accounts", () => {
  const base = records();
  const modified = {
    ...base,
    membershipsFromTrustedStore: [
      membership(personal, actor, "PERSONAL_OWNER", "REVOKED"),
      membership(business, actor, "BUSINESS_VIEWER", "SUSPENDED"),
      membership(stranger, other, "PERSONAL_OWNER")
    ]
  };
  assert.deepEqual(project(modified).accounts, []);
  assert.equal(project({
    ...base,
    membershipsFromTrustedStore: [
      membership(personal, other, "PERSONAL_OWNER"),
      membership(business, actor, "PERSONAL_OWNER")
    ]
  }).accounts.length, 0);
});

test("769: principal isolation remains effective if multiple accounts share a legal owner", () => {
  const base = records();
  const response = project({
    ...base,
    accountsFromTrustedStore: [
      account(personal, "PERSONAL"),
      account(business, "BUSINESS", actor)
    ],
    membershipsFromTrustedStore: [membership(personal, other, "PERSONAL_OWNER")]
  });
  assert.equal(response.accounts.length, 0);
});
