"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {auditPay54OfflinePreviewMarkup}
 from "../governance/pay54-offline-preview-markup-audit.mjs";
const fixture=()=>[
 '<!doctype html><html lang="en"><head>',
 '<meta name="viewport" content="width=device-width, initial-scale=1">',
 '<title>PAY54 — Dashboard</title></head><body>',
 '<aside role="note">PAY54 OFFLINE VISUAL PREVIEW — no payments</aside>',
 '<main><img src="data:image/svg+xml;base64,AAA" alt="PAY54">',
 '<button disabled type="button">Send</button>',
 '<input disabled aria-label="Currency"></main></body></html>'
].join("");
test("550: inert accessible source markup is not equivalent to browser or screen-reader certification",()=>{
 const r=auditPay54OfflinePreviewMarkup(fixture());
 assert.equal(r.sourceMarkupCheckPassed,true);
 assert.equal(r.browserInteractionVerified,false);
 assert.equal(r.screenReaderAuditPerformed,false);
 assert.equal(r.wcagConformanceCertified,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("550: missing mobile viewport, main landmark and alt text is refused",()=>{
 const bad=fixture().replace(/<meta name="viewport"[^>]*>/,"")
  .replace("<main>","<div>").replace("</main>","</div>")
  .replace(' alt="PAY54"',"");
 const r=auditPay54OfflinePreviewMarkup(bad);
 assert.ok(r.findings.includes("MOBILE_VIEWPORT_MISSING"));
 assert.ok(r.findings.includes("MAIN_LANDMARK_NOT_UNIQUE"));
 assert.ok(r.findings.includes("IMAGE_ALTERNATIVE_TEXT_MISSING"));
});
test("550: interactive controls and missing display-only banner are refused",()=>{
 const bad=fixture().replace('<button disabled','<button')
  .replace("<input disabled","<input")
  .replace("OFFLINE VISUAL PREVIEW","PREVIEW")
  .replace("</main>",'<a href="/send">Send</a></main>');
 const r=auditPay54OfflinePreviewMarkup(bad);
 for(const expected of ["ACTIVE_BUTTON_DETECTED","ACTIVE_FORM_FIELD_DETECTED",
  "ACTIVE_NAVIGATION_LINK_DETECTED","PREVIEW_DISCLOSURE_MISSING"]){
  assert.ok(r.findings.includes(expected),expected);
 }
});
test("550: invalid or oversized HTML fails closed",()=>{
 assert.throws(()=>auditPay54OfflinePreviewMarkup(null),/MARKUP_REQUIRED/);
});
