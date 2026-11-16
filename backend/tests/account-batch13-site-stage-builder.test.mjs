"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {stagePay54SiteCandidate} from "../governance/pay54-static-site-stage-builder.mjs";

function fixture(){
 const outer=mkdtempSync(join(tmpdir(),"pay54-site-stage-test-"));
 const source=join(outer,"source"),target=join(outer,"target");
 mkdirSync(join(source,"assets/js"),{recursive:true});
 mkdirSync(target);
 writeFileSync(join(source,"index.html"),'<script src="assets/js/app.js"></script>');
 writeFileSync(join(source,"assets/js/app.js"),"export const enabled=false;");
 mkdirSync(join(source,"backend"));
 writeFileSync(join(source,"backend/internal.mjs"),"private");
 return {outer,source,target,cleanup:()=>rmSync(outer,{recursive:true,force:true})};
}
test("386: output only contains allowlisted files, byte-for-byte",()=>{
 const f=fixture();
 try{
  const r=stagePay54SiteCandidate(f.source,f.target);
  assert.equal(r.candidateCount,2);
  assert.equal(r.productionRelease,"BLOCKED");
  assert.equal(r.actualPagesSettingsModified,false);
  assert.equal(readFileSync(join(f.target,"site/index.html"),"utf8"),
    readFileSync(join(f.source,"index.html"),"utf8"));
  assert.deepEqual(readdirSync(join(f.target,"site")).sort(),["assets","index.html"]);
 }finally{f.cleanup();}
});
test("386: existing destination content blocks staging and remains unchanged",()=>{
 const f=fixture();
 try{
  writeFileSync(join(f.target,"retain.txt"),"owner-data");
  assert.throws(()=>stagePay54SiteCandidate(f.source,f.target),
   /PAY54_STAGE_TARGET_MUST_BE_EMPTY_DIRECTORY/);
  assert.equal(readFileSync(join(f.target,"retain.txt"),"utf8"),"owner-data");
 }finally{f.cleanup();}
});
test("386: missing source asset prevents copying any file",()=>{
 const f=fixture();
 try{
  writeFileSync(join(f.source,"index.html"),'<script src="assets/js/missing.js"></script>');
  assert.throws(()=>stagePay54SiteCandidate(f.source,f.target),
   /PAY54_STAGE_LINK_REVIEW_FAILED/);
  assert.deepEqual(readdirSync(f.target),[]);
 }finally{f.cleanup();}
});
test("386: destination inside source is denied",()=>{
 const f=fixture();
 try{
  const unsafe=join(f.source,"nested");
  mkdirSync(unsafe);
  assert.throws(()=>stagePay54SiteCandidate(f.source,unsafe),
   /PAY54_STAGE_SOURCE_TARGET_OVERLAP/);
 }finally{f.cleanup();}
});

test("400: candidate staging refuses high-confidence credential marker without copying",()=>{
 const f=fixture();
 try{
  writeFileSync(join(f.source,"assets/js/app.js"),
   "const accidentallyPublic='ghp_"+"Z".repeat(36)+"';");
  assert.throws(()=>stagePay54SiteCandidate(f.source,f.target),
   /PAY54_STAGE_SECRET_MARKERS_PRESENT/);
  assert.deepEqual(readdirSync(f.target),[]);
 }finally{f.cleanup();}
});
