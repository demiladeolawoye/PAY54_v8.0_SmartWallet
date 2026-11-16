"use strict";

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateAccountDescriptor, accountCanOfferFinancialFeatures } from "../domain/account-model.mjs";
import { validateAccountMembership, authorizeAccountContext, describePermittedOperations } from "../domain/account-membership.mjs";
import { assertScopedFinancialRead, assertAccountTransferBoundary } from "../domain/account-ledger-boundary.mjs";
import { PAY54_SWITCHER_CONTRACT, getAccountSwitcherCandidate } from "../../assets/js/dashboard/account-switcher-contract.mjs";

const PRINCIPAL = "11111111-1111-4111-8111-111111111111";
const PERSONAL = "22222222-2222-4222-8222-222222222222";
const BUSINESS = "33333333-3333-4333-8333-333333333333";
const WALLET = "44444444-4444-4444-8444-444444444444";
const JOURNAL = "55555555-5555-4555-8555-555555555555";
const OTHER = "66666666-6666-4666-8666-666666666666";

const account = (type, id, owner=PRINCIPAL) => ({
  accountId: id, legalOwnerId: owner, type,
  displayName: type === "PERSONAL" ? "My personal account" : "Acme Business",
  status: "ACTIVE", verificationStatus: "VERIFIED"
});
const personal = account("PERSONAL", PERSONAL);
const business = account("BUSINESS", BUSINESS);
const member = (accountId, role, principalId=PRINCIPAL, status="ACTIVE") =>
  ({ accountId, principalId, status, role });

test("canonical account descriptors are immutable, precise and verification-gated", () => {
  assert.ok(Object.isFrozen(validateAccountDescriptor(personal)));
  assert.equal(accountCanOfferFinancialFeatures(personal), true);
  assert.throws(() => validateAccountDescriptor({ ...personal, status: "ACTIVE", verificationStatus: "NOT_VERIFIED" }));
  assert.throws(() => validateAccountDescriptor({ ...personal, type: "MERCHANT" }));
  assert.throws(() => validateAccountDescriptor({ ...personal, walletBalance: 200 }));
  assert.throws(() => validateAccountDescriptor({ ...personal, accountId: "invalid" }));
});

test("personal owner and business membership cannot be confused", () => {
  assert.ok(Object.isFrozen(validateAccountMembership(member(PERSONAL, "PERSONAL_OWNER"))));
  assert.equal(authorizeAccountContext({
    principalId: PRINCIPAL, account: personal, membership: member(PERSONAL, "PERSONAL_OWNER"), operation: "initiate"
  }), true);
  assert.equal(authorizeAccountContext({
    principalId: PRINCIPAL, account: business, membership: member(BUSINESS, "PERSONAL_OWNER"), operation: "view"
  }), false);
  assert.equal(authorizeAccountContext({
    principalId: OTHER, account: business, membership: member(BUSINESS, "BUSINESS_OWNER"), operation: "view"
  }), false);
  assert.equal(authorizeAccountContext({
    principalId: PRINCIPAL, account: business, membership: member(BUSINESS, "BUSINESS_OWNER", PRINCIPAL, "SUSPENDED"), operation: "view"
  }), false);
});

test("read-only business users may not initiate or approve", () => {
  const m = member(BUSINESS, "BUSINESS_VIEWER");
  assert.deepEqual(describePermittedOperations({principalId:PRINCIPAL,account:business,membership:m}), ["view"]);
  assert.equal(authorizeAccountContext({principalId:PRINCIPAL,account:business,membership:m,operation:"approve"}),false);
});

test("wallet and journal IDs must always match selected account ownership", () => {
  const m = member(BUSINESS, "BUSINESS_OWNER");
  const args = {principalId:PRINCIPAL,account:business,membership:m,wallet:{id:WALLET,accountId:BUSINESS},journal:{id:JOURNAL,accountId:BUSINESS}};
  assert.equal(assertScopedFinancialRead(args).scopeVerified,true);
  assert.throws(() => assertScopedFinancialRead({...args,wallet:{...args.wallet,accountId:PERSONAL}}),/WALLET_SCOPE_DENIED/);
  assert.throws(() => assertScopedFinancialRead({...args,journal:{...args.journal,accountId:PERSONAL}}),/JOURNAL_SCOPE_DENIED/);
  assert.throws(() => assertScopedFinancialRead({...args,membership:member(BUSINESS,"BUSINESS_VIEWER",OTHER)}),/ACCOUNT_ACCESS_DENIED/);
});

test("cross-account transfers remain proposals, never executed financial operations", () => {
  const result = assertAccountTransferBoundary(personal,business,PRINCIPAL,member(PERSONAL,"PERSONAL_OWNER"));
  assert.equal(result.executionAuthorised,false);
  assert.equal(result.requiresTrustedPostingService,true);
  assert.throws(() => assertAccountTransferBoundary(personal,personal,PRINCIPAL,member(PERSONAL,"PERSONAL_OWNER")) ,/SAME_ACCOUNT/);
  assert.throws(() => assertAccountTransferBoundary(personal,business,OTHER,member(PERSONAL,"PERSONAL_OWNER")) ,/ACCESS_DENIED/);
});

test("static profile navigation remains a non-activating blueprint contract", () => {
  assert.equal(PAY54_SWITCHER_CONTRACT.switchingEnabled,false);
  assert.equal(PAY54_SWITCHER_CONTRACT.businessAccountProvisioningEnabled,false);
  assert.equal(PAY54_SWITCHER_CONTRACT.previewExecutionEnabled,false);
  assert.ok(PAY54_SWITCHER_CONTRACT.requirements.some(x=>x.includes("Keyboard")));
  assert.ok(PAY54_SWITCHER_CONTRACT.requirements.some(x=>x.includes("Escape")));
  const candidate=getAccountSwitcherCandidate(BUSINESS);
  assert.equal(candidate.pendingServerAuthorisation,true);
  assert.equal(candidate.executed,false);
  assert.equal(getAccountSwitcherCandidate("not-an-id"),null);
  const shell=readFileSync(new URL("../../assets/js/dashboard-blueprint-shell.js",import.meta.url),"utf8");
  assert.match(shell,/Personal account · Switch unavailable/);
  assert.match(shell,/accountSwitcher\.disabled = true/);
  assert.doesNotMatch(shell,/make\("div", "p54b-side-muted", "Switch Profile · Personal"\)/);
});
