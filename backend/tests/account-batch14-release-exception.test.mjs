"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {reviewPay54ReleaseException}
 from "../governance/pay54-release-exception-review.mjs";
const now="2026-11-16T20:00:00.000Z";
function sample(){
 return {changeRequestId:"PAY54-CR-REVIEW-0001",
  commitSha:"a".repeat(40),gate:"NONCRITICAL_COPY_REVIEW",
  severity:"LOW",reason:"Reviewed user interface wording improvement with no financial impact",
  compensatingControl:"Separate security review and scoped regression monitoring in CI",
  owner:"product-owner",securityReviewer:"security-reviewer",
  releaseReviewer:"release-manager",expiresAt:"2026-11-18T20:00:00.000Z"};
}
test("464: exception evidence metadata never authorises a release",()=>{
 const r=reviewPay54ReleaseException(sample(),{now});
 assert.equal(r.eligibleForIndependentReview,true);
 assert.equal(r.actualRiskAcceptanceVerified,false);
 assert.equal(r.exceptionActivated,false);
 assert.equal(r.releaseAuthorised,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("464: P0 publication, regulatory and ledger gates cannot be waived",()=>{
 for(const gate of ["PAGES_ARTIFACT","PUBLIC_REACHABILITY",
  "TENANT_ISOLATION","REGULATORY_AUTHORISATION",
  "FINANCIAL_LEDGER_INTEGRITY"]){
  const r=reviewPay54ReleaseException({...sample(),gate},{now});
  assert.ok(r.findings.includes("NON_WAIVABLE_GATE"));
 }
});
test("464: high-severity and shared signoff are denied",()=>{
 const r=reviewPay54ReleaseException({...sample(),severity:"HIGH",
  securityReviewer:"product-owner"},{now});
 assert.ok(r.findings.includes("UNACCEPTABLE_SEVERITY"));
 assert.ok(r.findings.includes("INDEPENDENT_APPROVERS_REQUIRED"));
});
test("464: stale, overlong and missing expiry are denied",()=>{
 for(const expiresAt of ["2026-11-15T00:00:00Z","2026-12-31T00:00:00Z",null]){
  assert.equal(reviewPay54ReleaseException({...sample(),expiresAt},{now})
   .eligibleForIndependentReview,false);
 }
});
