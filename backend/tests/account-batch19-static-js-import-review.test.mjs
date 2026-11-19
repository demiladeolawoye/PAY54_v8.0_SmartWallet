"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {inspectPay54StaticJsImports}
 from "../governance/pay54-batch19-static-js-import-review.mjs";
function fixture(source,{provideDependency=true}={}){
 const root=mkdtempSync(join(tmpdir(),"pay54-js-static-imports-"));
 mkdirSync(join(root,"assets/js"),{recursive:true});
 writeFileSync(join(root,"index.html"),"<!doctype html><title>PAY54</title>");
 writeFileSync(join(root,"assets/js/app.js"),source);
 if(provideDependency)writeFileSync(join(root,"assets/js/driver.js"),"export const safe=true;");
 return {root,clean:()=>rmSync(root,{recursive:true,force:true})};
}
test("706: static relative import resolves only to an existing restricted candidate",()=>{
 const f=fixture('import {safe} from "./driver.js";');
 try{
  const r=inspectPay54StaticJsImports(f.root);
  assert.equal(r.literalReferencesReviewed,1);
  assert.equal(r.staticReferencesNonfailing,true);
  assert.deepEqual(r.findings,[]);
  assert.equal(r.runtimeDependencyGraphIndependentlyVerified,false);
  assert.equal(r.productionRelease,"BLOCKED");
 }finally{f.clean();}
});
test("706: missing browser script dependency requires review before Pages upload",()=>{
 const f=fixture('import "./not-present.js";');
 try{
  const r=inspectPay54StaticJsImports(f.root);
  assert.equal(r.staticReferencesNonfailing,false);
  assert.ok(r.findings.some(x=>x.kind==="MISSING_JS_IMPORT"));
 }finally{f.clean();}
});
test("706: dynamic import cannot be represented as statically verified",()=>{
 const f=fixture("const moduleName=window.pick; import(moduleName);");
 try{
  const r=inspectPay54StaticJsImports(f.root);
  assert.ok(r.dynamicImportExpressions>=1);
  assert.equal(r.dynamicImportReviewRequired,true);
  assert.equal(r.productionRelease,"BLOCKED");
 }finally{f.clean();}
});
test("706: remote and bare modules require review and never become internal assets",()=>{
 const f=fixture('import x from "https://cdn.example.invalid/a.js"; import y from "wallet-package";');
 try{
  const r=inspectPay54StaticJsImports(f.root);
  assert.equal(r.staticReferencesNonfailing,false);
  assert.ok(r.findings.some(x=>x.kind==="REMOTE_OR_DYNAMIC_MODULE"));
  assert.ok(r.findings.some(x=>x.kind==="UNRESOLVED_BARE_MODULE"));
 }finally{f.clean();}
});
