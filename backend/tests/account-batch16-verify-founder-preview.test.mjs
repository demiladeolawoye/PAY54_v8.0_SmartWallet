"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync}
 from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {createPay54FounderPreviewBundle}
 from "../governance/pay54-create-founder-preview.mjs";
import {verifyPay54OfflineFounderPreview}
 from "../governance/pay54-verify-founder-preview.mjs";

function fixture(){
 const root=mkdtempSync(join(tmpdir(),"pay54-verified-artifact-"));
 const source=join(root,"src"),out=join(root,"out");
 mkdirSync(join(source,"assets/css"),{recursive:true});
 mkdirSync(out);
 writeFileSync(join(source,"dashboard.html"),
  '<html><head><link rel="stylesheet" href="assets/css/dashboard.css"></head><body><button>Pay</button></body></html>');
 writeFileSync(join(source,"assets/css/dashboard.css"),"body{background:#fff}");
 const sha="c".repeat(40);
 createPay54FounderPreviewBundle(source,out,sha);
 return {root,site:join(out,"preview"),sha,clean:()=>rmSync(root,{recursive:true,force:true})};
}
test("547: downloaded preview can be locally verified with manifest and CSP",()=>{
 const f=fixture();
 try{
  const result=verifyPay54OfflineFounderPreview(f.site);
  assert.equal(result.localArtifactIntegrityPassed,true);
  assert.equal(result.sourceCommitSha,f.sha);
  assert.equal(result.independentGithubOriginVerified,false);
  assert.equal(result.realMoneyEnabled,false);
  assert.equal(result.productionRelease,"BLOCKED");
 }finally{f.clean();}
});
test("547: modified visual assets or unexpected files fail verification",()=>{
 const f=fixture();
 try{
  writeFileSync(join(f.site,"assets/css/dashboard.css"),"body{background:red}");
  const r=verifyPay54OfflineFounderPreview(f.site);
  assert.equal(r.localArtifactIntegrityPassed,false);
  assert.ok(r.failures.includes("PREVIEW_ASSET_INTEGRITY_FAILED"));
  writeFileSync(join(f.site,"extra.json"),"{}");
  const second=verifyPay54OfflineFounderPreview(f.site);
  assert.ok(second.failures.includes("PREVIEW_FILE_COUNT_MISMATCH"));
 }finally{f.clean();}
});
test("547: forged source SHA is not a valid local preview manifest",()=>{
 const f=fixture();
 try{
  const path=join(f.site,"preview-manifest.json");
  const m=JSON.parse(readFileSync(path,"utf8"));m.sourceCommitSha="short";
  writeFileSync(path,JSON.stringify(m));
  const r=verifyPay54OfflineFounderPreview(f.site);
  assert.ok(r.failures.includes("INVALID_MANIFEST_SCHEMA"));
 }finally{f.clean();}
});
test("547: preview cannot be safe if script is injected after packaging",()=>{
 const f=fixture();
 try{
  const path=join(f.site,"index.html");
  writeFileSync(path,readFileSync(path,"utf8")+"<script>alert(1)</script>");
  const r=verifyPay54OfflineFounderPreview(f.site);
  assert.ok(r.failures.includes("ACTIVE_PREVIEW_HTML_DENIED"));
 }finally{f.clean();}
});
