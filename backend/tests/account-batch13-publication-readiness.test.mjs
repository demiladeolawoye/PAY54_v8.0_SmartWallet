"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {inspectPay54PublicationReadiness} from "../governance/pay54-publication-source-readiness.mjs";

function fixture({html,css}){
 const root=mkdtempSync(join(tmpdir(),"pay54-publication-review-"));
 mkdirSync(join(root,"assets/css"),{recursive:true});
 mkdirSync(join(root,"assets/img"),{recursive:true});
 writeFileSync(join(root,"index.html"),html);
 writeFileSync(join(root,"assets/css/site.css"),css);
 writeFileSync(join(root,"assets/img/logo.svg"),"<svg></svg>");
 return {root,cleanup:()=>rmSync(root,{recursive:true,force:true})};
}
test("376: deterministic PASS never authorises production publication",()=>{
 const f=fixture({html:'<link href="assets/css/site.css" rel="stylesheet">',css:"a{background:url('../img/logo.svg')}"});
 try{
  const a=inspectPay54PublicationReadiness(f.root);
  const b=inspectPay54PublicationReadiness(f.root);
  assert.equal(a.sourceDependencyStatus,"PASS");
  assert.match(a.manifestSha256,/^[a-f0-9]{64}$/);
  assert.equal(a.manifestSha256,b.manifestSha256);
  assert.equal(a.htmlCheckedReferences,1);
  assert.equal(a.cssCheckedReferences,1);
  assert.equal(a.publicationAuthorized,false);
  assert.equal(a.productionRelease,"BLOCKED");
  assert.equal(a.actualArtifactInspected,false);
 }finally{f.cleanup();}
});
test("376: HTML and CSS missing references produce separate blocking issues",()=>{
 const f=fixture({html:'<script src="assets/js/missing.js"></script>',css:"a{background:url('../img/missing.svg')}"});
 try{
  const r=inspectPay54PublicationReadiness(f.root);
  assert.equal(r.sourceDependencyStatus,"FAIL");
  assert.deepEqual(r.issues.map(x=>x.category),["HTML_MISSING","CSS_MISSING"]);
  assert.equal(r.productionRelease,"BLOCKED");
 }finally{f.cleanup();}
});
test("376: security-rejected input cannot become production ready",()=>{
 const f=fixture({html:'<a href="javascript:alert(1)">bad</a>',css:"a{background:url('/backend/config.json')}"});
 try{
  const r=inspectPay54PublicationReadiness(f.root);
  assert.equal(r.sourceDependencyStatus,"FAIL");
  assert.deepEqual(r.issues.map(x=>x.category),["HTML_UNSAFE","CSS_UNSAFE"]);
 }finally{f.cleanup();}
});

test("408: external JavaScript with missing SRI requires manual review even if local links pass",()=>{
 const f=fixture({html:'<script src="https://cdn.example.invalid/app.js"></script>',css:"body{}"});
 try{
  const r=inspectPay54PublicationReadiness(f.root);
  assert.equal(r.sourceDependencyStatus,"PASS");
  assert.equal(r.thirdPartyScriptCount,1);
  assert.equal(r.thirdPartyScriptReviewStatus,"REVIEW_REQUIRED");
  assert.equal(r.thirdPartyScriptFindings[0].ruleId,"MISSING_VALID_SRI");
  assert.equal(r.thirdPartyBytesVerified,false);
  assert.equal(r.productionRelease,"BLOCKED");
 }finally{f.cleanup();}
});
