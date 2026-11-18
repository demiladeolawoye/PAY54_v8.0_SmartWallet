"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {inspectPay54JsLiteralDependencies}
 from "../governance/pay54-js-literal-dependency-review.mjs";
function fixture(js){
 const root=mkdtempSync(join(tmpdir(),"pay54-js-review-"));
 mkdirSync(join(root,"assets/js"),{recursive:true});
 mkdirSync(join(root,"assets/img"),{recursive:true});
 writeFileSync(join(root,"index.html"),"<title>PAY54</title>");
 writeFileSync(join(root,"assets/js/app.js"),js);
 writeFileSync(join(root,"assets/js/helper.js"),"export const ok=true;");
 writeFileSync(join(root,"assets/img/logo.svg"),"<svg/>");
 return {root,cleanup:()=>rmSync(root,{recursive:true,force:true})};
}
test("454: relative literal imports are resolved against static site assets",()=>{
 const f=fixture("import {ok} from './helper.js'; const logo=new URL('../img/logo.svg',import.meta.url);");
 try{
  const r=inspectPay54JsLiteralDependencies(f.root);
  assert.equal(r.literalSourceReviewPassed,true);
  assert.equal(r.checked.length,2);
  assert.deepEqual(r.missing,[]);
  assert.equal(r.fullRuntimeDependencyGraphVerified,false);
  assert.equal(r.productionRelease,"BLOCKED");
 }finally{f.cleanup();}
});
test("454: missing imported module is a source dependency issue",()=>{
 const f=fixture("import './absent.js';");
 try{
  const r=inspectPay54JsLiteralDependencies(f.root);
  assert.equal(r.literalSourceReviewPassed,false);
  assert.equal(r.missing[0].dependency,"assets/js/absent.js");
 }finally{f.cleanup();}
});
test("454: computed imports and package imports remain explicitly unresolved",()=>{
 const f=fixture("const name='./helper.js'; import(name); import x from 'sdk-package';");
 try{
  const r=inspectPay54JsLiteralDependencies(f.root);
  assert.equal(r.unresolved.length,2);
  assert.equal(r.fullRuntimeDependencyGraphVerified,false);
 }finally{f.cleanup();}
});
test("454: traversal outside assets is never accepted as published source",()=>{
 const f=fixture("import '../../../../backend/secrets.js';");
 try{
  const r=inspectPay54JsLiteralDependencies(f.root);
  assert.ok(r.unresolved.some(x=>x.reason==="OUTSIDE_PUBLIC_ASSETS"));
  assert.equal(r.publicationAuthorised,false);
 }finally{f.cleanup();}
});
