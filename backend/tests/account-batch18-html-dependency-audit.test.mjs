"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {inspectPay54FirstPartyHtmlDependencies}
 from "../governance/pay54-firstparty-html-dependency-audit.mjs";

function fixture(scriptPath){
 const root=mkdtempSync(join(tmpdir(),"pay54-html-publication-dependencies-"));
 mkdirSync(join(root,"assets/js/infrastructure"),{recursive:true});
 mkdirSync(join(root,"assets/css"),{recursive:true});
 writeFileSync(join(root,"index.html"),
  '<!doctype html><html><head><link rel="stylesheet" href="assets/css/site.css"></head><body>'+
  '<script src="'+scriptPath+'"></script></body></html>');
 writeFileSync(join(root,"assets/css/site.css"),"body{color:#fff}");
 writeFileSync(join(root,"assets/js/app.js"),"export const safe=true;");
 writeFileSync(join(root,"assets/js/infrastructure/provider.js"),"export const test=true;");
 return {root,clean:()=>rmSync(root,{recursive:true,force:true})};
}
test("619: approved static CSS and JS paths pass the source audit without deployment authority",()=>{
 const f=fixture("assets/js/app.js");
 try{
  const r=inspectPay54FirstPartyHtmlDependencies(f.root);
  assert.equal(r.publicDependencyGraphComplete,true);
  assert.equal(r.checkedReferences,2);
  assert.equal(r.classification.CANDIDATE_INCLUDED,2);
  assert.deepEqual(r.findings,[]);
  assert.equal(r.activePagesObserved,false);
  assert.equal(r.productionRelease,"BLOCKED");
 }finally{f.clean();}
});
test("619: forbidden linked-card infrastructure cannot be silently included",()=>{
 const f=fixture("assets/js/infrastructure/provider.js");
 try{
  const r=inspectPay54FirstPartyHtmlDependencies(f.root);
  assert.equal(r.publicDependencyGraphComplete,false);
  assert.equal(r.classification.FORBIDDEN_PUBLICATION_PATH,1);
  assert.deepEqual(r.findings,[{
   page:"index.html",target:"assets/js/infrastructure/provider.js",
   status:"FORBIDDEN_PUBLICATION_PATH"
  }]);
 }finally{f.clean();}
});
test("619: traversal, encoded path and remote authority are never approved as local",()=>{
 for(const ref of ["../backend/secret.js","assets/js/%2e%2e/secret.js","/backend/secret.js"]){
  const f=fixture(ref);
  try{
   const r=inspectPay54FirstPartyHtmlDependencies(f.root);
   assert.equal(r.publicDependencyGraphComplete,false,ref);
   assert.ok(r.findings.length>=1,ref);
  }finally{f.clean();}
 }
});
test("619: an absent asset is not interpreted as a permitted deployable asset",()=>{
 const f=fixture("assets/js/missing.js");
 try{
  const r=inspectPay54FirstPartyHtmlDependencies(f.root);
  assert.equal(r.classification.CANDIDATE_MISSING,1);
  assert.equal(r.publicDependencyGraphComplete,false);
 }finally{f.clean();}
});
