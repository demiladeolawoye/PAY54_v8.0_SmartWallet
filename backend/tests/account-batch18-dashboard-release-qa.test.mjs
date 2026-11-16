"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {reviewPay54DashboardReleaseQA}
 from "../governance/pay54-batch18-dashboard-release-qa.mjs";
const fixture=()=>({
 releaseCommitSha:"a".repeat(40),
 screenshotSourceSha:"a".repeat(40),
 viewportChecks:{desktop:true,tablet:true,mobile:true},
 balanceDetailsVisible:true,
 tabletMoneyMovesNoOverlap:true,
 anonymousLoginBoundaryPassed:true,
 syntheticPreviewNeverRunsFinance:true,
 keyboardFocusOrderReviewed:true,
 screenReaderDisclosureReviewed:true,
 mobileOverflowChecked:true
});
test("649: complete self-reported QA packet never certifies real customer finance",()=>{
 const r=reviewPay54DashboardReleaseQA(fixture());
 assert.equal(r.reviewPacketComplete,true);
 assert.equal(r.independentBrowserEvidenceValidated,false);
 assert.equal(r.authenticatedMoneyFlowsValidated,false);
 assert.equal(r.liveSiteTested,false);
 assert.equal(r.customerReleaseApproved,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("649: using old screenshots against newly edited CSS fails release-specific QA",()=>{
 const data=fixture();data.screenshotSourceSha="b".repeat(40);
 const r=reviewPay54DashboardReleaseQA(data);
 assert.ok(r.missingEvidence.includes("RELEASE_AND_SCREENSHOT_SOURCE_SHA_MISMATCH"));
 assert.equal(r.reviewPacketComplete,false);
});
test("649: visual screenshots do not replace keyboard/screen-reader evaluation",()=>{
 const data=fixture();
 data.keyboardFocusOrderReviewed=false;
 data.screenReaderDisclosureReviewed=false;
 const r=reviewPay54DashboardReleaseQA(data);
 assert.ok(r.missingEvidence.includes("QA_CONTROL_NOT_EVIDENCED_KEYBOARDFOCUSORDERREVIEWED"));
 assert.ok(r.missingEvidence.includes("QA_CONTROL_NOT_EVIDENCED_SCREENREADERDISCLOSUREREVIEWED"));
});
test("649: missing responsive viewport fails closed",()=>{
 const data=fixture();delete data.viewportChecks.mobile;
 assert.ok(reviewPay54DashboardReleaseQA(data).missingEvidence.includes("MISSING_VISUAL_QA_MOBILE"));
 assert.throws(()=>reviewPay54DashboardReleaseQA(null),/PACKET_REQUIRED/);
});
