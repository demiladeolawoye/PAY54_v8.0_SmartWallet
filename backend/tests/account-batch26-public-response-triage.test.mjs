"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {triagePay54PublicResponse as triage}
 from "../governance/pay54-batch26-public-response-triage.mjs";
const path="backend/src/server.mjs";
test("1023: 200 Javascript/SQL-shaped source request raises review but not breach claim",()=>{
 const r=triage({requestPath:path,statusCode:200,
  contentType:"text/javascript"});
 assert.equal(r.responseMayContainSensitiveSource,true);
 assert.equal(r.finalSourceExposureConfirmed,false);
 assert.equal(r.releaseAuthorised,false);
});
test("1023: SPA fallback 200 HTML does not constitute source exposure evidence",()=>{
 const r=triage({requestPath:path,statusCode:200,contentType:"text/html"});
 assert.equal(r.suspectedSpaFallback,true);
 assert.equal(r.responseMayContainSensitiveSource,false);
});
test("1023: 302, 403, 404 cannot silently become safe",()=>{
 for(const code of [302,403,404]){
  const r=triage({requestPath:path,statusCode:code,
   contentType:"text/html"});
  assert.equal(r.finalSourceExposureConfirmed,false);
  assert.equal(r.releaseAuthorised,false);
 }
});
test("1023: unknown private path and broken response metadata deny",()=>{
 assert.throws(()=>triage({requestPath:"https://evil.example",
  statusCode:200,contentType:"text/plain"}),/PUBLIC_RESPONSE_TRIAGE_DENIED/);
 assert.throws(()=>triage({requestPath:path,statusCode:"200",
  contentType:"text/plain"}),/PUBLIC_RESPONSE_TRIAGE_DENIED/);
});
