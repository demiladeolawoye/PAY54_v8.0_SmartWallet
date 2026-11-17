"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { validatePay54AccountSwitchCsrf as validate }
  from "../domain/account-switch-csrf.mjs";

const token = randomBytes(32).toString("base64url");
const good = {
  trustedApplicationOrigin: "https://wallet.example",
  requestOrigin: "https://wallet.example",
  csrfFromTrustedSession: token,
  csrfPresentedByRequest: token
};
test("803: strong session-bound CSRF token and canonical origin pass only preflight", () => {
  const result = validate(good);
  assert.equal(result.csrfVerified, true);
  assert.equal(result.originVerified, true);
  assert.equal(result.accountSwitchCompleted, false);
  assert.ok(Object.isFrozen(result));
});
test("803: wrong origin, attacker token and header tricks fail closed", () => {
  for (const override of [
    { requestOrigin: "https://attacker.example" },
    { requestOrigin: "null" },
    { requestOrigin: "https://wallet.example.attacker.example" },
    { requestOrigin: "https://wallet.example/path" },
    { requestOrigin: "http://wallet.example" },
    { trustedApplicationOrigin: "http://wallet.example" },
    { csrfPresentedByRequest: randomBytes(32).toString("base64url") },
    { csrfPresentedByRequest: "browser-token" },
    { csrfFromTrustedSession: "not-from-session" },
    { csrfPresentedByRequest: undefined }
  ]) assert.throws(() => validate({ ...good, ...override }), /CSRF_DENIED/);
});
