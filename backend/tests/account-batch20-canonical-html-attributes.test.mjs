"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {auditPay54StaticSiteLinks}
 from "../governance/pay54-static-site-link-audit.mjs";
function source(html){
 const root=mkdtempSync(join(tmpdir(),"pay54-batch20-liveattr-"));
 mkdirSync(join(root,"assets/js"),{recursive:true});
 writeFileSync(join(root,"index.html"),html);
 writeFileSync(join(root,"assets/js/ok.js"),"export const ok=true;");
 return {root,cleanup:()=>rmSync(root,{recursive:true,force:true})};
}
test("721: canonical asset review ignores arbitrary src-like prose",()=>{
 const f=source('PAY54 guide says src="backend/internal.js".<script src="assets/js/ok.js"></script>');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.complete,true);
  assert.equal(r.checkedLocalReferences,1);
 }finally{f.cleanup();}
});
test("721: duplicate active src remains refused even if the first value is safe",()=>{
 const f=source('<script src="assets/js/ok.js" src="https://other.invalid/evil.js"></script>');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.complete,false);
  assert.ok(r.rejectedReferences.some(x=>x.reason==="HTML_ATTRIBUTE_DUPLICATE_ATTRIBUTE"));
 }finally{f.cleanup();}
});
test("721: real forbidden linked-card path cannot hide behind data-src",()=>{
 const f=source('<script data-src="assets/js/ok.js" src="assets/js/infrastructure/payments/providers/linked-card-development.js"></script>');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.complete,false);
  assert.equal(r.missingLocalReferences[0].resolved,
   "assets/js/infrastructure/payments/providers/linked-card-development.js");
 }finally{f.cleanup();}
});
test("721: active resource markup with greater-than inside title remains safe",()=>{
 const f=source('<script title="status > pending" src="assets/js/ok.js"></script>');
 try{
  const r=auditPay54StaticSiteLinks(f.root);
  assert.equal(r.checkedLocalReferences,1);
  assert.equal(r.complete,true);
 }finally{f.cleanup();}
});
