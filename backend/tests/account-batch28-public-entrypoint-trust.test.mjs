"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {assessPay54CheckoutEntrypoints as checkout,
 assessPay54PublicEntrypointTrust as inspect}
 from "../release/pay54-public-entrypoint-trust.mjs";
test("1203: legacy root remains a demo and never authorises live banking",()=>{
 const r=checkout();
 assert.equal(r.actualLiveWebsiteNotVerified,true);
 assert.ok(r.root.directTrustMisrepresentationFlags.includes(
  "client-session-guard"));
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

test("1209: original dashboard script remains while unverified KYC is disclosed",()=>{
 const r=checkout();
 assert.equal(r.root.directTrustMisrepresentationFlags.includes(
  "unverified-kyc-claim"),false);
 assert.equal(r.root.directTrustMisrepresentationFlags.includes(
  "unverified-compliance-claim"),false);
 const root=readFileSync(new URL("../../index.html",import.meta.url),"utf8");
 assert.match(root,/PAY54 development preview/);
 assert.match(root,/Not verified \(demo\)/);
 assert.match(root,/assets\/js\/dashboard-core\.js/);
 assert.match(root,/assets\/js\/session\.js/);
 assert.match(root,/data-action="send"/);
});
