"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { validatePay54AccountReadContinuity as check }
  from "../domain/account-read-continuity.mjs";

const initial = Object.freeze({
  sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  principalId: "11111111-1111-4111-8111-111111111111",
  status: "ACTIVE",
  version: 4,
  issuedAtMs: 1000,
  expiresAtMs: 5000,
  activeAccountId: "22222222-2222-4222-8222-222222222222"
});
const verify = (latestSession, latestServerTimeMs = 3000) =>
  check({
    initialSession: initial,
    latestSession,
    initialServerTimeMs: 2000,
    latestServerTimeMs
  });

test("790: unchanged trusted session across read produces frozen read-only fence", () => {
  const result = verify({ ...initial });
  assert.equal(result.continuousAtReadBoundary, true);
  assert.equal(result.accountSwitchCompleted, false);
  assert.equal(result.productionReady, false);
  assert.ok(Object.isFrozen(result));
});

test("790: rotated, revoked, switched, expired and impersonated sessions are denied", () => {
  for (const mutation of [
    { sessionId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" },
    { principalId: "99999999-9999-4999-8999-999999999999" },
    { version: 5 },
    { status: "REVOKED" },
    { issuedAtMs: 1200 },
    { expiresAtMs: 4500 },
    { activeAccountId: "33333333-3333-4333-8333-333333333333" },
    { activeAccountId: null }
  ]) assert.throws(() => verify({ ...initial, ...mutation }), /CONTINUITY_DENIED/);
  assert.throws(() => verify({ ...initial }, 5000), /CONTINUITY_DENIED/);
  assert.throws(() => verify({ ...initial }, 1900), /CONTINUITY_DENIED/);
  assert.throws(() => verify(null), /CONTINUITY_DENIED/);
});
