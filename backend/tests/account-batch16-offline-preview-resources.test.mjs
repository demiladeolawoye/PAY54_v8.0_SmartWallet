"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {auditPay54OfflinePreviewResources}
 from "../governance/pay54-offline-preview-resource-audit.mjs";

test("559: local CSS/logo and inlined SVG image remain offline-only references",()=>{
 const html=[
  '<link rel="stylesheet" href="assets/css/dashboard.css?v=1.0">',
  '<img src="assets/img/pay54-logo.svg">',
  '<img src="data:image/svg+xml;base64,PHN2Zy8+">'
 ].join("");
 const report=auditPay54OfflinePreviewResources(html);
 assert.equal(report.sourceReferencesLocal,true);
 assert.equal(report.examinedReferences,3);
 assert.equal(report.networkRequestsPerformed,false);
 assert.equal(report.productionRelease,"BLOCKED");
});
test("559: HTTPS, websocket, mail and protocol-relative references are denied",()=>{
 for(const bad of [
  "https://api.example.invalid/payments",
  "//thirdparty.example.invalid/card",
  "mailto:support@example.org",
  "javascript:alert(1)",
  "/backend/secrets.js",
  "assets/img/../js/app.js",
  "assets/img/%2e%2e/private.svg"
 ]){
  const report=auditPay54OfflinePreviewResources('<img src="'+bad+'">');
  assert.equal(report.sourceReferencesLocal,false,bad);
  assert.ok(report.findings.includes("REMOTE_OR_UNSAFE_RESOURCE_REFERENCE"));
 }
});
test("559: srcset requires independent preview asset review",()=>{
 const r=auditPay54OfflinePreviewResources(
  '<img src="assets/img/logo.svg" srcset="https://example.invalid/image.png 2x">');
 assert.equal(r.sourceReferencesLocal,false);
 assert.ok(r.findings.includes("RESPONSIVE_SOURCE_SET_REQUIRES_REVIEW"));
});
test("559: unsafe input is rejected",()=>{
 assert.throws(()=>auditPay54OfflinePreviewResources(null),/HTML_REQUIRED/);
});

test("559: inert data-action metadata is not mistaken for an outbound HTML resource",()=>{
 const r=auditPay54OfflinePreviewResources(
  '<button disabled data-action="send" data-src="demo" type="button">Send</button>');
 assert.equal(r.examinedReferences,0);
 assert.equal(r.sourceReferencesLocal,true);
});
