"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {auditPay54StaticSiteLinks}
 from "../governance/pay54-static-site-link-audit.mjs";
function fixture(html){
 const root=mkdtempSync(join(tmpdir(),"pay54-static-link-attrs-"));
 mkdirSync(join(root,"assets/img"),{recursive:true});
 writeFileSync(join(root,"index.html"),html);
 writeFileSync(join(root,"assets/img/logo.svg"),"<svg></svg>");
 return {root,dispose:()=>rmSync(root,{recursive:true,force:true})};
}
test("674: inert data-src and data-href are not treated as browser resource loads",()=>{
 const f=fixture('<button data-src="wallet" data-href="some-action" data-action="send">Send</button>');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.checkedLocalReferences,0);
  assert.deepEqual(r.missingLocalReferences,[]);
  assert.deepEqual(r.rejectedReferences,[]);
  assert.equal(r.complete,true);
 }finally{f.dispose();}
});
test("674: actual src and href attributes still resolve candidate file paths",()=>{
 const f=fixture('<img src="assets/img/logo.svg"><a href="assets/img/logo.svg">Logo</a>');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.checkedLocalReferences,2);
  assert.equal(r.complete,true);
 }finally{f.dispose();}
});
test("674: a real disallowed infrastructure script remains missing from the restricted candidate",()=>{
 const f=fixture('<script src="assets/js/infrastructure/payments/providers/linked-card-development.js"></script>');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.complete,false);
  assert.equal(r.missingLocalReferences[0].resolved,
   "assets/js/infrastructure/payments/providers/linked-card-development.js");
 }finally{f.dispose();}
});
test("674: javascript and relative traversal in actual attrs are denied",()=>{
 const f=fixture('<a href="javascript:alert(1)">x</a><img src="../backend/private.svg">');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.complete,false);
  assert.ok(r.rejectedReferences.some(x=>x.reason==="UNSAFE_URL"));
  assert.ok(r.rejectedReferences.some(x=>x.reason==="PATH_TRAVERSAL"));
 }finally{f.dispose();}
});

test("677: responsive srcset cannot bypass static-publication first-party review",()=>{
 const f=fixture('<img src="assets/img/logo.svg" srcset="https://cdn.example.invalid/private.png 2x">');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.complete,false);
  assert.ok(r.rejectedReferences.some(x=>
   x.reason==="RESPONSIVE_SOURCE_SET_REQUIRES_REVIEW"));
 }finally{f.dispose();}
});
test("677: inert data-srcset does not count as an image source",()=>{
 const f=fixture('<button data-srcset="preview" data-action="send">Send</button>');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.complete,true);
  assert.deepEqual(r.rejectedReferences,[]);
 }finally{f.dispose();}
});

test("679: page scoping restricts HTML asset audit to approved root site pages",()=>{
 const f=fixture('<img src="assets/img/logo.svg">');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.checkedLocalReferences,1);
  assert.equal(r.complete,true);
 }finally{f.dispose();}
});

test("681: form submission action destinations require independent review",()=>{
 const f=fixture('<form method="post" action="https://unknown.example.invalid/kyc"><input name="id"></form>');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.complete,false);
  assert.ok(r.rejectedReferences.some(x=>x.reason==="FORM_SUBMISSION_REQUIRES_REVIEW"));
 }finally{f.dispose();}
});
test("681: inert data-action and data-formaction remain ordinary UI metadata",()=>{
 const f=fixture('<div data-action="send" data-formaction="synthetic"><button>Submit</button></div>');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.complete,true);
 }finally{f.dispose();}
});

test("683: base href cannot silently redirect all first-party asset references",()=>{
 const f=fixture('<base href="https://malicious.example.invalid/"><img src="assets/img/logo.svg">');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.complete,false);
  assert.ok(r.rejectedReferences.some(x=>x.reason==="DOCUMENT_BASE_URL_REQUIRES_REVIEW"));
 }finally{f.dispose();}
});
test("683: meta http-equiv refresh needs independent redirect review",()=>{
 const f=fixture('<meta http-equiv="refresh" content="0;url=https://other.example.invalid/"><h1>PAY54</h1>');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.complete,false);
  assert.ok(r.rejectedReferences.some(x=>x.reason==="ACTIVE_REDIRECT_REQUIRES_REVIEW"));
 }finally{f.dispose();}
});
