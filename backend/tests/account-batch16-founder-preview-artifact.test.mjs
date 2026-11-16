"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPay54FounderPreviewBundle}
 from "../governance/pay54-create-founder-preview.mjs";

const SHA="e".repeat(40);
function fixture(){
 const root=mkdtempSync(join(tmpdir(),"pay54-founder-bundle-"));
 const source=join(root,"source"),target=join(root,"out");
 mkdirSync(join(source,"assets/css"),{recursive:true});
 mkdirSync(join(source,"assets/js"),{recursive:true});
 mkdirSync(target);
 writeFileSync(join(source,"dashboard.html"),
  '<html><head><link rel="stylesheet" href="assets/css/dashboard.css"></head><body><button>Send</button></body></html>');
 writeFileSync(join(source,"assets/css/dashboard.css"),"body{font-family:system-ui}");
 writeFileSync(join(source,"assets/js/app.js"),"throw new Error('must never run')");
 return {root,source,target,clean:()=>rmSync(root,{recursive:true,force:true})};
}
test("534: founder preview artifact contains no engine and cannot execute a transaction",()=>{
 const f=fixture();
 try{
  const r=createPay54FounderPreviewBundle(f.source,f.target,SHA);
  assert.equal(r.hosted,false);
  assert.equal(r.sourceCommitSha,SHA);
  assert.match(r.contentManifestSha256,/^[a-f0-9]{64}$/);
  const m=JSON.parse(readFileSync(join(f.target,"preview/preview-manifest.json"),"utf8"));
  assert.equal(m.sourceCommitSha,SHA);
  assert.equal(m.scriptsIncluded,false);
  assert.equal(r.userDataUsed,false);
  assert.equal(r.sourceScriptsBundled,false);
  assert.equal(r.financialTransactionsEnabled,false);
  assert.equal(r.productionRelease,"BLOCKED");
  assert.match(r.fileManifestSha256,/^[a-f0-9]{64}$/);
  const html=readFileSync(join(f.target,"preview/index.html"),"utf8");
  assert.match(html,/script-src 'none'/);
  assert.doesNotMatch(html,/<script\b/i);
  assert.deepEqual(readdirSync(join(f.target,"preview/assets")),["css"]);
 }finally{f.clean();}
});
test("534: empty output requirement prevents replacing or mixing existing files",()=>{
 const f=fixture();
 try{
  writeFileSync(join(f.target,"private.txt"),"synthetic");
  assert.throws(()=>createPay54FounderPreviewBundle(f.source,f.target),
   /EMPTY_TARGET_REQUIRED/);
 }finally{f.clean();}
});
