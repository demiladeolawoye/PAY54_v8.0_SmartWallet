"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { parsePay54AccountSwitchRequest as parse }
  from "../domain/account-switch-request.mjs";

const id = "33333333-3333-4333-8333-333333333333";
test("801: only requested UUID survives and never authorises a switch", () => {
  const result = parse({ requestedAccountId: id.toUpperCase() });
  assert.equal(result.requestedAccountId, id);
  assert.equal(result.accountSwitchCompleted, false);
  assert.equal(result.requiresServerMembershipAuthorisation, true);
  assert.ok(Object.isFrozen(result));
});

test("801: reject impersonation, forged roles, attributes and malformed payloads", () => {
  for (const value of [
    null, [], "Business", {},
    { requestedAccountId: "business" },
    { requestedAccountId: id, role: "BUSINESS_OWNER" },
    { requestedAccountId: id, principalId: id },
    { requestedAccountId: id, balance: 500 },
    { requestedAccountId: id, authenticated: true },
    Object.assign(Object.create(null), { requestedAccountId: id })
  ]) assert.throws(() => parse(value), /SWITCH_REQUEST_INVALID/);
});
