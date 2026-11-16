"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {inspectPay54InlineScripts}
 from "../governance/pay54-batch19-inline-script-inventory.mjs";
function fixture(body){
 const root=mkdtempSync(join(tmpdir(),"pay54-inline-script-review-"));
 writeFileSync(join(root,"index.html"),body);
 return {root,clean:()=>rmSync(root,{recursive:true,force:true})};
}
test("689: executable inline scripts get SHA256 proof without source text disclosure",()=>{
 const f=fixture('<script>console.log("visual fixture")</script>');
 try{
  const r=inspectPay54InlineScripts(f.root);
  assert.equal(r.executableInlineScriptCount,1);
  assert.match(r.scripts[0].sha256,/^[a-f0-9]{64}$/);
  assert.equal(r.manualInlineScriptReviewRequired,true);
  assert.equal(r.scriptsIndependentlyAudited,false);
  assert.equal(r.productionRelease,"BLOCKED");
 }finally{f.clean();}
});
test("689: inactive JSON data scripts are not classified as executable",()=>{
 const f=fixture('<script type="application/json">{"title":"PAY54"}</script>');
 try{
  const r=inspectPay54InlineScripts(f.root);
  assert.equal(r.executableInlineScriptCount,0);
 }finally{f.clean();}
});
test("689: active storage and network calls remain flagged for manual review",()=>{
 const f=fixture('<script>window.fetch("/api/funds");localStorage.setItem("x","y");</script>');
 try{
  const r=inspectPay54InlineScripts(f.root);
  assert.equal(r.executableInlineScriptCount,1);
  assert.equal(r.scripts[0].dynamicRuntimeReviewRequired,true);
 }finally{f.clean();}
});
test("689: sourced scripts do not get falsely counted as inline",()=>{
 const f=fixture('<script src="assets/js/app.js"></script>');
 try{
  const r=inspectPay54InlineScripts(f.root);
  assert.equal(r.executableInlineScriptCount,0);
 }finally{f.clean();}
});
