"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { PAY54_ACCOUNT_CONTEXT_CACHE_DOMAINS as domains }
  from "../domain/account-context-cache-plan.mjs";
import { assessPay54AccountCacheRefreshEvidence as assess }
  from "../domain/account-cache-refresh-evidence.mjs";

const previous = "22222222-2222-4222-8222-222222222222";
const next = "33333333-3333-4333-8333-333333333333";
const input = {
  fromAccountId: previous,
  toAccountId: next,
  abortedOldRequests: true,
  clearedDomains: [...domains],
  verifiedFreshReads: [...domains]
};
test("809: every sensitive domain must be cleared and refreshed before evidence review", () => {
  const record = assess(input);
  assert.equal(record.evaluatedDomains.length, 10);
  assert.equal(record.evidenceCompleteForReview, true);
  assert.equal(record.accountSwitchCompleted, false);
  assert.equal(record.productionReady, false);
  assert.ok(Object.isFrozen(record.evaluatedDomains));
});
test("809: stale requests, missing domains and duplicated receipts fail closed", () => {
  for (const inputChange of [
    { abortedOldRequests: false },
    { toAccountId: previous },
    { clearedDomains: domains.slice(1) },
    { verifiedFreshReads: domains.slice(0, -1) },
    { clearedDomains: [...domains.slice(1), domains[1]] },
    { verifiedFreshReads: [...domains.slice(1), domains[1]] },
    { clearedDomains: [] }
  ]) assert.throws(() => assess({ ...input, ...inputChange }), /CACHE_EVIDENCE_INVALID/);
});
