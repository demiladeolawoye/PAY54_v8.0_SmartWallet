"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,symlinkSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {inspectPay54PublicationTree} from "../governance/pay54-publication-tree-inspector.mjs";

function fixture(){
 const root=mkdtempSync(join(tmpdir(),"pay54-publish-tree-"));
 mkdirSync(join(root,"assets","js"),{recursive:true});
 writeFileSync(join(root,"index.html"),"<!doctype html><title>PAY54</title>");
 writeFileSync(join(root,"assets/js/app.js"),"export const enabled = false;");
 return {root,clean:()=>rmSync(root,{recursive:true,force:true})};
}
test("469: normal restricted static tree yields hashes without authorising release",()=>{
 const f=fixture();
 try{
  const a=inspectPay54PublicationTree(f.root);
  const b=inspectPay54PublicationTree(f.root);
  assert.equal(a.sourcePolicyPassed,true);
  assert.equal(a.fileCount,2);
  assert.equal(a.manifestSha256,b.manifestSha256);
  assert.equal(a.publicationAuthorised,false);
  assert.equal(a.liveArtifactInspected,false);
  assert.equal(a.productionRelease,"BLOCKED");
 }finally{f.clean();}
});
test("469: internal backend tree, environment files and map files fail",()=>{
 const f=fixture();
 try{
  mkdirSync(join(f.root,"backend"));
  writeFileSync(join(f.root,"backend/config.js"),"no real secret");
  writeFileSync(join(f.root,".env"),"SYNTHETIC_ONLY");
  writeFileSync(join(f.root,"assets/js/app.js.map"),"{}");
  const r=inspectPay54PublicationTree(f.root);
  assert.equal(r.sourcePolicyPassed,false);
  assert.ok(r.findings.some(x=>x.reason==="INTERNAL_OR_SENSITIVE_PATH"));
  assert.ok(r.findings.some(x=>x.reason==="UNSAFE_NAME"));
 }finally{f.clean();}
});
test("469: symlinks are not followed outside the publication root",()=>{
 const f=fixture();
 try{
  symlinkSync(join(f.root,"index.html"),join(f.root,"assets/js/link.js"));
  const r=inspectPay54PublicationTree(f.root);
  assert.equal(r.sourcePolicyPassed,false);
  assert.ok(r.findings.some(x=>x.reason==="UNSAFE_FILE_TYPE"));
 }finally{f.clean();}
});
test("469: case-insensitive file collisions are detected",()=>{
 const f=fixture();
 try{
  writeFileSync(join(f.root,"Index.html"),"one");
  const r=inspectPay54PublicationTree(f.root);
  assert.equal(r.sourcePolicyPassed,false);
  assert.ok(r.findings.some(x=>x.reason==="CASE_COLLISION"));
 }finally{f.clean();}
});
test("469: file tampering and unapproved extensions prevent a safe report",()=>{
 const f=fixture();
 try{
  writeFileSync(join(f.root,"debug.exe"),"test");
  const r=inspectPay54PublicationTree(f.root);
  assert.equal(r.sourcePolicyPassed,false);
  assert.ok(r.findings.some(x=>x.reason==="UNAPPROVED_FILE_EXTENSION"));
 }finally{f.clean();}
});
test("469: source inspector refuses missing root and symlink root",()=>{
 const f=fixture();
 try{
  assert.throws(()=>inspectPay54PublicationTree(null),/ROOT_REQUIRED/);
  const alias=join(tmpdir(),"pay54-tree-test-"+process.pid+"-"+Date.now());
  symlinkSync(f.root,alias);
  try{assert.throws(()=>inspectPay54PublicationTree(alias),/NOT_PLAIN_DIRECTORY/);}
  finally{rmSync(alias,{force:true});}
 }finally{f.clean();}
});

test("481: internal documentation remains excluded even if renamed into static assets",()=>{
 const f=fixture();
 try{
  mkdirSync(join(f.root,"assets/docs"),{recursive:true});
  writeFileSync(join(f.root,"assets/docs/strategy.html"),"internal draft");
  const result=inspectPay54PublicationTree(f.root);
  assert.equal(result.sourcePolicyPassed,false);
  assert.ok(result.findings.some(x=>
   x.path==="assets/docs"&&x.reason==="INTERNAL_OR_SENSITIVE_PATH"));
 }finally{f.clean();}
});
test("481: README, configuration and infrastructure-style source cannot publish",()=>{
 const f=fixture();
 try{
  writeFileSync(join(f.root,"README.md"),"# internal notes");
  mkdirSync(join(f.root,"infrastructure"));
  writeFileSync(join(f.root,"infrastructure/main.tf"),"synthetic");
  const r=inspectPay54PublicationTree(f.root);
  assert.equal(r.sourcePolicyPassed,false);
  assert.ok(r.findings.some(x=>x.path==="infrastructure"));
  assert.ok(r.findings.some(x=>x.path==="README.md"));
 }finally{f.clean();}
});
