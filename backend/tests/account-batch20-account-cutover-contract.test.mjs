"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const SOURCE=new URL("../../docs/engineering/pay54-batch20-account-context-cutover-contract.md",import.meta.url);
const read=()=>readFileSync(SOURCE,"utf8");
test("765: cutover document preserves canonical domain logic and exact source modules",()=>{
  const s=read();
  for(const fragment of [
    "account-model.mjs","account-membership.mjs","account-ledger-boundary.mjs",
    "account-context-selection.mjs","account-context-rebind.mjs",
    "account-context-cache-plan.mjs","ACCOUNT_CONTEXT_SERVICE_UNAVAILABLE",
    "PERSONAL_OWNER","BUSINESS_OWNER","BUSINESS_VIEWER"
  ]) assert.ok(s.includes(fragment),fragment);
});
test("765: authenticating a viewer never grants a banking transaction",()=>{
  const s=read();
  assert.match(s,/A Business viewer is not authorised to initiate or approve payments/);
  assert.match(s,/A valid account view is not money authorisation/);
  assert.match(s,/does not issue tokens or mutate a session/);
  assert.match(s,/does not clear a cache or transfer funds/);
});
test("765: production requires RLS, CSRF, revocation and cache isolation",()=>{
  const s=read();
  for(const fragment of [
    "PostgreSQL RLS","atomic compare-and-swap","anti-replay",
    "CSRF","old in-flight requests","Personal→Business→Personal",
    "wallets","transactions","cards","audit"
  ])assert.ok(s.includes(fragment),fragment);
});
test("765: original Pages P0, simulated card provider and regulated release remain open",()=>{
  const s=read();
  assert.match(s,/historical GitHub Pages artifact overincluded internal source/);
  assert.match(s,/development-only linked-card provider/);
  assert.match(s,/CTO disposition: NO-GO/);
  assert.match(s,/draft PR must stay unmerged/);
});
