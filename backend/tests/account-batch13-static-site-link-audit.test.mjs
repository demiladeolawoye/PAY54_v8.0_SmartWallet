"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {auditPay54StaticSiteLinks} from "../governance/pay54-static-site-link-audit.mjs";

function fixture(html){
 const root=mkdtempSync(join(tmpdir(),"pay54-link-audit-"));
 mkdirSync(join(root,"assets/js"),{recursive:true});
 writeFileSync(join(root,"index.html"),html);
 writeFileSync(join(root,"assets/js/app.js"),"export {};");
 return {root,cleanup:()=>rmSync(root,{force:true,recursive:true})};
}
test("369: referenced allowed local assets pass without authorising publication",()=>{
 const f=fixture('<script src="assets/js/app.js?v=42"></script><a href="#main">Go</a>');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.complete,true);
  assert.equal(r.checkedLocalReferences,1);
  assert.equal(r.productionRelease,"BLOCKED");
  assert.equal(r.publicationAuthorized,false);
 }finally{f.cleanup();}
});
test("369: missing local assets fail closed",()=>{
 const f=fixture('<script src="assets/js/missing.js"></script>');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.complete,false);
  assert.equal(r.missingLocalReferences[0].resolved,"assets/js/missing.js");
 }finally{f.cleanup();}
});
test("369: unsafe schemes, protocol-relative paths and traversal are rejected",()=>{
 const f=fixture('<a href="javascript:alert(1)">bad</a><script src="//host/x.js"></script><script src="%2e%2e/backend/secrets.js"></script>');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.complete,false);
  assert.equal(r.rejectedReferences.length,3);
 }finally{f.cleanup();}
});
test("369: HTTPS CDN links are recorded without assuming trust",()=>{
 const f=fixture('<script src="https://cdn.example.test/app.js"></script>');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.complete,true);
  assert.equal(r.externalReferences.length,1);
 }finally{f.cleanup();}
});

test("380: data and blob URL schemes cannot bypass the HTML publication gate",()=>{
 const f=fixture('<a href="data:text/html,%3Cscript%3E">bad</a><a href="blob:https://host/123">bad</a>');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.complete,false);
  assert.equal(r.rejectedReferences.length,2);
 }finally{f.cleanup();}
});
test("380: site-root-relative links are rejected on project-path Pages deployments",()=>{
 const f=fixture('<script src="/assets/js/app.js"></script>');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.complete,false);
  assert.equal(r.rejectedReferences[0].reason,"UNSAFE_PATH");
 }finally{f.cleanup();}
});
test("380: mail and telephone references are inventoried, never treated as local files",()=>{
 const f=fixture('<a href="mailto:support@example.invalid">Mail</a><a href="tel:+4400000000">Call</a>');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.complete,true);
  assert.equal(r.externalReferences.length,2);
 }finally{f.cleanup();}
});

test("406: unquoted HTML script and stylesheet references are audited",()=>{
 const f=fixture('<script src=assets/js/app.js></script><link href=assets/css/missing.css>');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.complete,false);
  assert.equal(r.checkedLocalReferences,2);
  assert.deepEqual(r.missingLocalReferences.map(x=>x.resolved),
   ["assets/css/missing.css"]);
 }finally{f.cleanup();}
});
test("406: unquoted potentially executable URL is rejected",()=>{
 const f=fixture('<a href=javascript:alert(1)>bad</a>');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.complete,false);
  assert.equal(r.rejectedReferences[0].reason,"UNSAFE_URL");
 }finally{f.cleanup();}
});
