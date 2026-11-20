"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {redactedPay54EvidenceSummary as report}
 from "../governance/pay54-batch27-evidence-privacy.mjs";
const valid={correlationId:"pay54-review-2026",
 sourceSha:"a".repeat(40),evidenceClass:"PAGES",
 classification:"NOT_VERIFIED"};
test("1086: emitted evidence excludes customer data and private response bytes",()=>{
 const x=report(valid);
 assert.equal(x.includesPrivateSourceBytes,false);
 assert.equal(x.incidentClosureAuthorised,false);
 assert.ok(Object.isFrozen(x));
});
test("1086: token, HTML and private properties cannot be smuggled into summary",()=>{
 for(const x of [
  {...valid,correlationId:"<script>evil()</script>"},
  {...valid,evidenceClass:"CUSTOMER_BALANCE"},
  {...valid,classification:"SAFE_AND_PRODUCTION_READY"},
  {...valid,sourceSha:"not a SHA"}
 ])assert.throws(()=>report(x),/EVIDENCE_PRIVACY_DENIED/);
});
