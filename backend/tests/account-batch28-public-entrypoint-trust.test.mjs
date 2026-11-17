"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54CheckoutEntrypoints as checkout,
 assessPay54PublicEntrypointTrust as inspect}
 from "../release/pay54-public-entrypoint-trust.mjs";
test("1203: checkout legacy root makes unverified security/KYC promises",()=>{
 const r=checkout();
 assert.equal(r.actualLiveWebsiteNotVerified,true);
 assert.ok(r.root.directTrustMisrepresentationFlags.includes(
  "unverified-compliance-claim"));
 assert.ok(r.root.directTrustMisrepresentationFlags.includes(
  "unverified-kyc-claim"));
 assert.equal(r.root.allowedAsCustomerBankingEntrypoint,false);
 assert.equal(r.currentFinancialReleaseBlocked,true);
});
test("1203: separated marketing preview discloses nonfinancial status",()=>{
 const r=checkout().isolatedPreview;
 assert.equal(r.explicitlyNonfinancialDisclosed,true);
 assert.equal(r.directTrustMisrepresentationFlags.length,0);
 assert.equal(r.standaloneMarketingCandidateReviewable,true);
 assert.equal(r.releaseAuthorised,false);
});
test("1203: HTML claiming verified live banking never becomes safe without proof",()=>{
 const r=inspect({html:"<strong>Security & Financial compliance active</strong>"});
 assert.ok(r.directTrustMisrepresentationFlags.length>0);
 assert.equal(r.allowedAsCustomerBankingEntrypoint,false);
});
