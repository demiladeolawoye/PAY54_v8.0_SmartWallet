"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
 mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync
} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {stagePay54SiteCandidate} from "../governance/pay54-static-site-stage-builder.mjs";
import {verifyPay54StagedSite} from "../governance/pay54-static-site-stage-verifier.mjs";

function fixture(){
 const root=mkdtempSync(join(tmpdir(),"pay54-stage-verify-"));
 const source=join(root,"source"),output=join(root,"output");
 mkdirSync(join(source,"assets","js"),{recursive:true});
 mkdirSync(output);
 writeFileSync(join(source,"index.html"),'<script src="assets/js/app.js"></script>');
 writeFileSync(join(source,"assets/js/app.js"),"export const active=false;");
 stagePay54SiteCandidate(source,output);
 return {root,source,site:join(output,"site"),
  cleanup:()=>rmSync(root,{recursive:true,force:true})};
}
test("390: verified staged candidate remains explicitly blocked from release",()=>{
 const f=fixture();
 try{
  const report=verifyPay54StagedSite(f.source,f.site);
  assert.equal(report.verified,true);
  assert.equal(report.expectedCount,2);
  assert.equal(report.actualCount,2);
  assert.deepEqual(report.additionalFiles,[]);
  assert.deepEqual(report.missingFiles,[]);
  assert.deepEqual(report.mismatchedFiles,[]);
  assert.equal(report.realPagesArtifactInspected,false);
  assert.equal(report.productionRelease,"BLOCKED");
 }finally{f.cleanup();}
});
test("390: tampered staged bytes fail closed",()=>{
 const f=fixture();
 try{
  writeFileSync(join(f.site,"assets/js/app.js"),"export const active=true;");
  const r=verifyPay54StagedSite(f.source,f.site);
  assert.equal(r.verified,false);
  assert.deepEqual(r.mismatchedFiles,["assets/js/app.js"]);
 }finally{f.cleanup();}
});
test("390: additional hidden source-like files and missing file fail closed",()=>{
 const f=fixture();
 try{
  writeFileSync(join(f.site,".env"),"not-a-real-secret");
  rmSync(join(f.site,"assets/js/app.js"));
  const r=verifyPay54StagedSite(f.source,f.site);
  assert.equal(r.verified,false);
  assert.deepEqual(r.additionalFiles,[".env"]);
  assert.deepEqual(r.missingFiles,["assets/js/app.js"]);
 }finally{f.cleanup();}
});
test("390: symbolic links are rejected before verifying content",()=>{
 const f=fixture();
 try{
  symlinkSync(join(f.source,"index.html"),join(f.site,"assets/js/link.js"));
  assert.throws(()=>verifyPay54StagedSite(f.source,f.site),
   /PAY54_STAGE_VERIFY_UNSAFE_ENTRY/);
 }finally{f.cleanup();}
});
test("390: verification rejects nested stage roots",()=>{
 const f=fixture();
 try{
  assert.throws(()=>verifyPay54StagedSite(f.source,f.source),
   /PAY54_STAGE_VERIFY_OVERLAPPING_ROOTS/);
 }finally{f.cleanup();}
});
