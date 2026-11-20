"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54PublicSecurityHeaders as inspect}
 from "../governance/pay54-batch27-public-security-headers.mjs";
test("1131: strict CSP/HSTS metadata is not real browser evidence",()=>{
 const r=inspect({headers:{
  "content-security-policy":"default-src 'self'; object-src 'none'; frame-ancestors 'none'",
  "strict-transport-security":"max-age=31536000",
  "x-frame-options":"DENY"
 }});
 assert.equal(r.strictCspClaimed,true);
 assert.equal(r.hstsHalfYearOrMoreClaimed,true);
 assert.equal(r.actualBrowserHeadersIndependentlyObserved,false);
});
test("1131: unsafe-inline, wildcard and absent HSTS cannot pass source review",()=>{
 const r=inspect({headers:{
  "content-security-policy":"default-src * 'unsafe-inline'",
  "strict-transport-security":"max-age=10"}});
 assert.equal(r.strictCspClaimed,false);
 assert.equal(r.hstsHalfYearOrMoreClaimed,false);
 assert.throws(()=>inspect({headers:{"bad header":"x"}}),
 /PUBLIC_SECURITY_HEADERS_DENIED/);
});
