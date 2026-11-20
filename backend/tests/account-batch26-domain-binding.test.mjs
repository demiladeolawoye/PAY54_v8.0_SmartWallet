"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54PagesDomainBinding as a}
 from "../governance/pay54-batch26-domain-binding.mjs";
test("1030: claimed certificate does not prove domain binding",()=>{
 const r=a({hostname:"getpay54.com",
  reportedCname:"demiladeolawoye.github.io",
  httpsCertificateValid:true,recordObservedAtMs:1800000000000});
 assert.equal(r.dnsIndependentlyVerified,false);
 assert.equal(r.customDomainActuallyActiveVerified,false);
});
test("1030: arbitrary DNS hosts and malformed times deny",()=>{
 for(const override of [{hostname:"evil.example"},
  {reportedCname:"attacker.example"},
  {recordObservedAtMs:NaN}]){
  assert.throws(()=>a({hostname:"getpay54.com",
    reportedCname:"demiladeolawoye.github.io",
    httpsCertificateValid:true,recordObservedAtMs:1800000000000,...override}),
   /PAGES_DOMAIN_BINDING_DENIED/);
 }
});
