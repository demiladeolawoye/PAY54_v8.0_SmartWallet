"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {auditPay54ExternalScripts}
 from "../governance/pay54-external-script-source-review.mjs";
function fixture(html){
 const root=mkdtempSync(join(tmpdir(),"pay54-ext-script-"));
 writeFileSync(join(root,"index.html"),html);
 return {root,cleanup:()=>rmSync(root,{recursive:true,force:true})};
}
test("402: versioned CDN without integrity is flagged as a review dependency",()=>{
 const f=fixture('<script src="https://cdn.example.invalid/pkg/1.0/app.js"></script>');
 try{
  const r=auditPay54ExternalScripts(f.root);
  assert.equal(r.externalScriptCount,1);
  assert.equal(r.findings[0].ruleId,"MISSING_VALID_SRI");
  assert.equal(r.externalBytesVerified,false);
  assert.equal(r.productionRelease,"BLOCKED");
 }finally{f.cleanup();}
});
test("402: valid SRI metadata is recognised but not independently attested",()=>{
 const f=fixture('<script crossorigin="anonymous" integrity="sha384-AAAAAAAAAAAAAAAAAAAAAAAAAAAA" src="https://cdn.example.invalid/app.js"></script>');
 try{
  const r=auditPay54ExternalScripts(f.root);
  assert.equal(r.externalScripts[0].integrityConfigured,true);
  assert.equal(r.externalScripts[0].crossoriginConfigured,true);
  assert.equal(r.findings.length,0);
  assert.equal(r.externalBytesVerified,false);
 }finally{f.cleanup();}
});
test("402: script HTTP transport produces separate transport and integrity findings",()=>{
 const f=fixture('<script src="http://cdn.example.invalid/app.js"></script>');
 try{
  const r=auditPay54ExternalScripts(f.root);
  assert.deepEqual(r.findings.map(x=>x.ruleId),
   ["INSECURE_EXTERNAL_SCRIPT","MISSING_VALID_SRI"]);
 }finally{f.cleanup();}
});
test("402: HTML comments and local scripts are excluded from remote inventory",()=>{
 const f=fixture('<!-- <script src="https://cdn.example.invalid/a.js"></script> --><script src="assets/js/app.js"></script>');
 try{
  const r=auditPay54ExternalScripts(f.root);
  assert.equal(r.externalScriptCount,0);
 }finally{f.cleanup();}
});
