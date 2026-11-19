"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { buildPay54AccountSwitchAuditIntent as build }
  from "../domain/account-switch-audit-intent.mjs";

const admission = {
  schema: "pay54.account-switch-admission.v1",
  principalId: "11111111-1111-4111-8111-111111111111",
  fromSessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  requestedAccountId: "33333333-3333-4333-8333-333333333333",
  expectedSessionVersion: 9,
  financialExecutionAuthorised: false,
  switchExecuted: false,
  productionReady: false,
  csrfSecret: "must-never-log"
};
const input = {
  switchAdmission: admission,
  correlationId: "44444444-4444-4444-8444-444444444444",
  serverEventTimeMs: 1700000000000
};
test("807: audit intent is noncommitted, immutable and contains no CSRF or cookie fields", () => {
  const record = build(input);
  assert.equal(record.outcome, "NOT_COMMITTED");
  assert.equal(record.switchExecuted, false);
  assert.equal(record.requiresDurableAppendOnlyAudit, true);
  assert.ok(Object.isFrozen(record));
  assert.equal(JSON.stringify(record).includes("must-never-log"), false);
  assert.equal(Object.hasOwn(record, "csrfSecret"), false);
});
test("807: reject falsely committed outcome, malformed admission and timestamp", () => {
  for (const change of [
    { switchAdmission: { ...admission, switchExecuted: true } },
    { switchAdmission: { ...admission, productionReady: true } },
    { switchAdmission: { ...admission, expectedSessionVersion: 0 } },
    { correlationId: "not-a-uuid" },
    { serverEventTimeMs: Number.NaN }
  ]) assert.throws(() => build({ ...input, ...change }), /AUDIT_INTENT_DENIED/);
});
