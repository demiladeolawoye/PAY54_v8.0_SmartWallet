"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {assessPay54OfflinePreviewReadiness}
 from "../governance/pay54-dashboard-preview-readiness.mjs";

function fixture(html){
 const root=mkdtempSync(join(tmpdir(),"pay54-preview-readiness-fixture-"));
 mkdirSync(join(root,"assets/css"),{recursive:true});
 writeFileSync(join(root,"dashboard.html"),html??[
  "<html><head>",
  '<link rel="stylesheet" href="assets/css/dashboard.css">',
  "</head><body><button>Send</button></body></html>"
 ].join(""));
 writeFileSync(join(root,"assets/css/dashboard.css"),"body{color:#123}");
 return {root,cleanup:()=>rmSync(root,{recursive:true,force:true})};
}
test("531: clean visual-only source can be checked without persistent preview files",()=>{
 const f=fixture();
 try{
  const report=assessPay54OfflinePreviewReadiness(f.root);
  assert.equal(report.previewCandidateGenerated,true);
  assert.equal(report.visualAssetCount,1);
  assert.equal(report.userDataLoaded,false);
  assert.equal(report.previewHosted,false);
  assert.equal(report.realMoneyEnabled,false);
  assert.equal(report.productionRelease,"BLOCKED");
 }finally{f.cleanup();}
});
test("531: external stylesheet refusal is a stable code without leaking URLs",()=>{
 const f=fixture();
 try{
  writeFileSync(join(f.root,"assets/css/dashboard.css"),
   '@import url("https://sensitive.example.invalid/never-fetch.css");');
  const report=assessPay54OfflinePreviewReadiness(f.root);
  assert.equal(report.previewCandidateGenerated,false);
  assert.equal(report.refusalCode,"PAY54_PREVIEW_CSS_DEPENDENCY_UNVERIFIED");
  assert.equal(JSON.stringify(report).includes("sensitive.example.invalid"),false);
 }finally{f.cleanup();}
});
test("531: invalid preview source fails with no production enablement",()=>{
 const f=fixture("<html><head></head><body><iframe src='https://example.org'></iframe></body></html>");
 try{
  const report=assessPay54OfflinePreviewReadiness(f.root);
  assert.equal(report.previewCandidateGenerated,false);
  assert.equal(report.refusalCode,"PAY54_PREVIEW_EMBEDDED_CONTENT_DENIED");
  assert.equal(report.productionRelease,"BLOCKED");
 }finally{f.cleanup();}
});
