"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
  PAY54_PAYTAG_CONTRACT,
  normalisePay54PayTag,
  maskPay54AccountNumber
} from "../domain/paytag-identity-contract.mjs";

test("PayTag normalisation is canonical and immutable, not an ownership lookup", () => {
  for (const value of ["@Demi_User", "DEMI_USER"]) {
    const alias = normalisePay54PayTag(value);
    assert.equal(alias.canonical, "demi_user");
    assert.equal(alias.display, "@demi_user");
    assert.equal(alias.ownershipVerified, false);
    assert.equal(alias.availableForClaim, null);
    assert.equal(alias.recipientVerified, false);
    assert.equal(alias.financialExecutionEnabled, false);
    assert.ok(Object.isFrozen(alias));
  }
});

test("PayTag syntax rejects whitespace, traversal, injection, Unicode and ambiguity", () => {
  const invalid = [
    "", "@", "@ab", "@123", "@-abc", "abc-", "abc_", "a..bc",
    "ab__c", "ab--c", " aBc", "abc ", "@@abc", "abc/def",
    "abc\\def", "abc@def", "abc%20", "<script>", "foo.bar/",
    "école", "аlpha", "ab\u200bd", "abc\n", "abc\u0000x",
    "x".repeat(25), 12, null, {}, [], "ABC.!"
  ];
  for (const value of invalid) {
    assert.throws(() => normalisePay54PayTag(value), {message: "PAYTAG_INVALID"}, String(value));
  }
});

test("PayTag syntax accepts exact boundaries and deliberate single separators", () => {
  for (const value of ["abc", "z".repeat(24), "alice.5", "a_b", "john-doe"]) {
    const alias = normalisePay54PayTag(value);
    assert.equal(alias.display, "@" + value);
  }
});

test("Sensitive and deceptive institutional tags are never claimable via this contract", () => {
  for (const value of ["@admin", "official", "PAY54", "payments", "security", "pay54-support"]) {
    assert.throws(() => normalisePay54PayTag(value), {message: "PAYTAG_UNAVAILABLE"});
  }
});

test("Account numbers are masked for display; no bank/account identity inferred", () => {
  assert.equal(maskPay54AccountNumber("3001234567"), "•••• 4567");
  assert.equal(maskPay54AccountNumber("GB29 NWBK 6016 1331 9268 19"), "•••• 6819");
  for (const value of ["", "123", "1234", "12345", "3".repeat(35), "1/12345", "12\n3456", null]) {
    assert.throws(() => maskPay54AccountNumber(value), {message: "ACCOUNT_DISPLAY_INVALID"});
  }
});

test("This source contract cannot claim registry, identity, money or publication authority", () => {
  const p = PAY54_PAYTAG_CONTRACT;
  assert.ok(Object.isFrozen(p));
  assert.equal(p.accountOrWalletOwnershipVerified, false);
  assert.equal(p.tagRegistrationEnabled, false);
  assert.equal(p.recipientResolutionEnabled, false);
  assert.equal(p.directoryDiscoveryEnabled, false);
  assert.equal(p.publicAccountNumberDisclosure, false);
  assert.equal(p.financialExecutionEnabled, false);
  assert.equal(p.productionRelease, "BLOCKED");
});
