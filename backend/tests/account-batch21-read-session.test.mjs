"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { validatePay54AccountReadSession as validate }
  from "../domain/account-read-session.mjs";

const session = Object.freeze({
  sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  principalId: "11111111-1111-4111-8111-111111111111",
  status: "ACTIVE", version: 2, issuedAtMs: 1000, expiresAtMs: 2000
});
const check = (s, serverTimeMs = 1500) =>
  validate({ sessionFromTrustedAuthority: s, serverTimeMs });

test("775: only an active, unexpired, versioned trusted session is eligible", () => {
  const result = check(session);
  assert.equal(result.principalId, session.principalId);
  assert.equal(result.sessionVersion, 2);
  assert.equal(result.accountSwitchCompleted, false);
  assert.ok(Object.isFrozen(result));
});
test("775: expiry, future issue, stale clock and inactive sessions fail closed", () => {
  for (const s of [
    { ...session, expiresAtMs: 1500 },
    { ...session, issuedAtMs: 1501 },
    { ...session, status: "REVOKED" },
    { ...session, status: "SUSPENDED" },
    { ...session, version: 0 },
    { ...session, version: 1.1 },
    { ...session, sessionId: "browser-controlled" },
    { ...session, principalId: "not-a-principal" },
    { ...session, expiresAtMs: 999 }
  ]) assert.throws(() => check(s), /SESSION_NOT_AUTHORISED/);
  assert.throws(() => check(session, Number.NaN), /SESSION_NOT_AUTHORISED/);
  assert.throws(() => check(null), /SESSION_NOT_AUTHORISED/);
});
