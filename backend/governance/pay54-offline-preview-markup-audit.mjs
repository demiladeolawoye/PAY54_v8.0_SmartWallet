"use strict";

/**
 * PAY54 item 549 — bounded source-markup accessibility audit for an inert
 * offline dashboard. Does not emulate browser focus, screen readers, or WCAG
 * audits. It verifies only reviewable structural preview invariants.
 */
export function auditPay54OfflinePreviewMarkup(html){
 if(typeof html!=="string"||html.length<20||html.length>800_000){
  throw new TypeError("PAY54_PREVIEW_MARKUP_REQUIRED");
 }
 const findings=[];
 if(!/<html\b[^>]*\blang\s*=\s*["'][a-z]{2}(?:-[a-z]+)?["']/i.test(html)){
  findings.push("DOCUMENT_LANGUAGE_MISSING");
 }
 if(!/<title>\s*[^<\s][^<]*<\/title>/i.test(html)){
  findings.push("DOCUMENT_TITLE_MISSING");
 }
 if(!/<meta\b[^>]*\bname\s*=\s*["']viewport["']/i.test(html)){
  findings.push("MOBILE_VIEWPORT_MISSING");
 }
 const mains=(html.match(/<main\b/gi)??[]).length;
 if(mains!==1)findings.push("MAIN_LANDMARK_NOT_UNIQUE");
 if(!/<aside\b[^>]*\brole\s*=\s*["']note["'][^>]*>[^<]*OFFLINE VISUAL PREVIEW/i.test(html)){
  findings.push("PREVIEW_DISCLOSURE_MISSING");
 }
 for(const image of html.match(/<img\b[^>]*>/gi)??[]){
  if(!/\balt\s*=\s*["'][^"']*["']/i.test(image)){
   findings.push("IMAGE_ALTERNATIVE_TEXT_MISSING");
  }
 }
 for(const button of html.match(/<button\b[^>]*>/gi)??[]){
  if(!/\bdisabled\b/i.test(button))findings.push("ACTIVE_BUTTON_DETECTED");
 }
 for(const field of html.match(/<(?:input|select|textarea)\b[^>]*>/gi)??[]){
  if(!/\bdisabled\b/i.test(field))findings.push("ACTIVE_FORM_FIELD_DETECTED");
 }
 if(/<a\b/i.test(html))findings.push("ACTIVE_NAVIGATION_LINK_DETECTED");
 return Object.freeze({
  schema:"pay54.offline-preview-markup-review.v1",
  findings:Object.freeze([...new Set(findings)]),
  sourceMarkupCheckPassed:findings.length===0,
  browserInteractionVerified:false,
  screenReaderAuditPerformed:false,
  wcagConformanceCertified:false,
  productionRelease:"BLOCKED"
 });
}
