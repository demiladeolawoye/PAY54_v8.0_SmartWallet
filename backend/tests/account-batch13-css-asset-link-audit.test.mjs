"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {auditPay54CssAssetLinks} from "../governance/pay54-css-asset-link-audit.mjs";

function fixture(css){
 const root=mkdtempSync(join(tmpdir(),"pay54-css-audit-"));
 mkdirSync(join(root,"assets/css"),{recursive:true});
 mkdirSync(join(root,"assets/img"),{recursive:true});
 writeFileSync(join(root,"index.html"),"<title>PAY54</title>");
 writeFileSync(join(root,"assets/css/app.css"),css);
 writeFileSync(join(root,"assets/img/logo.svg"),"<svg></svg>");
 return {root,cleanup:()=>rmSync(root,{force:true,recursive:true})};
}
test("372: CSS references to allowed local assets are accepted without publication permission",()=>{
 const f=fixture("body {background-image:url('../img/logo.svg?v=1')}");
 try{
  const r=auditPay54CssAssetLinks(f.root);
  assert.equal(r.complete,true);
  assert.equal(r.checkedLocalReferences,1);
  assert.equal(r.publicationAuthorized,false);
  assert.equal(r.productionRelease,"BLOCKED");
 }finally{f.cleanup();}
});
test("372: missing asset is diagnosed",()=>{
 const f=fixture("a {background:url('../img/absent.svg')}");
 try{
  const r=auditPay54CssAssetLinks(f.root);
  assert.equal(r.complete,false);
  assert.equal(r.missingLocalReferences[0].resolved,"assets/img/absent.svg");
 }finally{f.cleanup();}
});
test("372: encoded and raw traversals, root URLs and script schemes are rejected",()=>{
 const f=fixture("a{background:url('../../../secrets')} b{background:url('%2e%2e/x')} c{background:url('/backend/x')} d{background:url('javascript:alert')}");
 try{
  const r=auditPay54CssAssetLinks(f.root);
  assert.equal(r.complete,false);
  assert.equal(r.rejectedReferences.length,4);
 }finally{f.cleanup();}
});
test("372: safe image data URI and external URLs are inventoried, not trusted",()=>{
 const f=fixture('a{background:url("data:image/svg+xml,%3Csvg%3E%3C/svg%3E")} b{background:url("https://example.invalid/a.png")}');
 try{
  const r=auditPay54CssAssetLinks(f.root);
  assert.equal(r.complete,true);
  assert.equal(r.inlineDataReferences,1);
  assert.equal(r.externalReferences.length,1);
 }finally{f.cleanup();}
});
test("372: unsupported data MIME and protocol-relative links fail closed",()=>{
 const f=fixture("a{background:url('data:text/html,<html>')} b{background:url('//host/asset.png')}");
 try{
  const r=auditPay54CssAssetLinks(f.root);
  assert.equal(r.complete,false);
  assert.equal(r.rejectedReferences.length,2);
 }finally{f.cleanup();}
});
