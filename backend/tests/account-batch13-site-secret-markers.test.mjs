"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {inspectPay54StaticSiteSecrets}
 from "../governance/pay54-static-site-secret-markers.mjs";

function fixture(value){
 const root=mkdtempSync(join(tmpdir(),"pay54-marker-review-"));
 mkdirSync(join(root,"assets/js"),{recursive:true});
 writeFileSync(join(root,"index.html"),"<h1>PAY54</h1>");
 writeFileSync(join(root,"assets/js/app.js"),value);
 return {root,cleanup:()=>rmSync(root,{recursive:true,force:true})};
}
test("396: harmless public frontend file has no marker findings",()=>{
 const f=fixture("export const APP_VERSION='v13';");
 try{
  const r=inspectPay54StaticSiteSecrets(f.root);
  assert.equal(r.sourceMarkerReviewPassed,true);
  assert.equal(r.findingCount,0);
  assert.equal(r.productionRelease,"BLOCKED");
  assert.equal(r.exhaustiveSecretScan,false);
 }finally{f.cleanup();}
});
test("396: sensitive markers are reported without disclosing values",()=>{
 const testCredential="ghp_"+"A".repeat(36);
 const f=fixture("const accidental='"+testCredential+"';");
 try{
  const r=inspectPay54StaticSiteSecrets(f.root);
  assert.equal(r.sourceMarkerReviewPassed,false);
  assert.deepEqual(r.findings,[{path:"assets/js/app.js",ruleId:"GITHUB_TOKEN"}]);
  assert.equal(r.valuesReported,false);
  assert.equal(JSON.stringify(r).includes(testCredential),false);
 }finally{f.cleanup();}
});
test("396: private key header and AWS identity fail source review",()=>{
 const f=fixture("-----BEGIN PRIVATE KEY-----\nAKIA"+"A".repeat(16));
 try{
  const r=inspectPay54StaticSiteSecrets(f.root);
  assert.equal(r.sourceMarkerReviewPassed,false);
  assert.deepEqual(r.findings.map(x=>x.ruleId),
    ["PRIVATE_KEY_BLOCK","AWS_ACCESS_KEY"]);
 }finally{f.cleanup();}
});
test("396: unselected backend source is out of static publication scope",()=>{
 const f=fixture("export {};");
 try{
  mkdirSync(join(f.root,"backend"));
  writeFileSync(join(f.root,"backend/secrets.mjs"),"-----BEGIN PRIVATE KEY-----");
  const r=inspectPay54StaticSiteSecrets(f.root);
  assert.equal(r.sourceMarkerReviewPassed,true);
  assert.equal(r.inspectedTextFiles,2);
 }finally{f.cleanup();}
});
