"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {hashPay54StaticSiteCandidate} from "../governance/pay54-static-site-content-integrity.mjs";

function fixture(){
 const root=mkdtempSync(join(tmpdir(),"pay54-content-hash-"));
 mkdirSync(join(root,"assets/js"),{recursive:true});
 writeFileSync(join(root,"index.html"),"<title>PAY54</title>");
 writeFileSync(join(root,"assets/js/app.js"),"export const live = false;");
 return {root,cleanup:()=>rmSync(root,{force:true,recursive:true})};
}
test("382: deterministic candidate digests attest exact selected source bytes",()=>{
 const f=fixture();
 try{
  const a=hashPay54StaticSiteCandidate(f.root);
  const b=hashPay54StaticSiteCandidate(f.root);
  assert.equal(a.manifestSha256,b.manifestSha256);
  assert.equal(a.candidateCount,2);
  assert.match(a.manifestSha256,/^[0-9a-f]{64}$/);
  assert.ok(a.files.every(x=>/^[a-f0-9]{64}$/.test(x.sha256)));
  assert.equal(a.productionRelease,"BLOCKED");
  assert.equal(a.realPagesArtifactInspected,false);
 }finally{f.cleanup();}
});
test("382: content mutation changes the candidate digest",()=>{
 const f=fixture();
 try{
  const before=hashPay54StaticSiteCandidate(f.root).manifestSha256;
  writeFileSync(join(f.root,"assets/js/app.js"),"export const live = true;");
  const after=hashPay54StaticSiteCandidate(f.root).manifestSha256;
  assert.notEqual(after,before);
 }finally{f.cleanup();}
});
test("382: unapproved backend file is never part of public source digest",()=>{
 const f=fixture();
 try{
  const before=hashPay54StaticSiteCandidate(f.root);
  mkdirSync(join(f.root,"backend"));
  writeFileSync(join(f.root,"backend/internal.mjs"),"secret");
  const after=hashPay54StaticSiteCandidate(f.root);
  assert.equal(after.manifestSha256,before.manifestSha256);
  assert.ok(after.files.every(x=>!x.path.startsWith("backend/")));
 }finally{f.cleanup();}
});
