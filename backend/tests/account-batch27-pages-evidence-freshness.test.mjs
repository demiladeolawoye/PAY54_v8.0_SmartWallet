"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {reviewPay54OperationalEvidenceFreshness as review}
 from "../governance/pay54-batch27-pages-evidence-freshness.mjs";
const sha="a".repeat(40),now=1800000000000;
const valid={expectedSha:sha,evidenceSha:sha,
 collectedAtMs:now-30000,independentlyObservedAtMs:now-5000,
 serverNowMs:now};
test("1073: fresh matching source evidence still is not a release approval",()=>{
 const r=review(valid);
 assert.equal(r.observedWithinPermittedAge,true);
 assert.equal(r.evidenceIndependentlyAuthenticated,false);
});
test("1073: future observations, expired evidence, drift SHA and maxAge override deny",()=>{
 for(const change of [
  {evidenceSha:"b".repeat(40)},
  {collectedAtMs:now-3600001},
  {independentlyObservedAtMs:now+1},
  {independentlyObservedAtMs:now-31000},
  {maxAgeMs:9999999999}
 ])assert.throws(()=>review({...valid,...change}),
 /EVIDENCE_FRESHNESS_DENIED/);
});
