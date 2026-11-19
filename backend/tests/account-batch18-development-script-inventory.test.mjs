"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,writeFileSync,rmSync,mkdirSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {inventoryPay54BrowserDevelopmentScripts}
 from "../governance/pay54-batch18-development-script-inventory.mjs";
function fixture(src){
 const root=mkdtempSync(join(tmpdir(),"pay54-browser-development-"));
 mkdirSync(join(root,"assets/js"),{recursive:true});
 writeFileSync(join(root,"dashboard.html"),
  '<html><body><script src="'+src+'"></script></body></html>');
 return {root,clean:()=>rmSync(root,{recursive:true,force:true})};
}
test("638: linked-card development simulation is explicitly excluded from customer release",()=>{
 const f=fixture("assets/js/infrastructure/payments/providers/linked-card-development.js");
 try{
  const r=inventoryPay54BrowserDevelopmentScripts(f.root);
  assert.equal(r.matches.length,1);
  assert.equal(r.matches[0].releaseClassification,
   "DEVELOPMENT_PROVIDER_FORBIDDEN_IN_PUBLIC_RELEASE");
  assert.equal(r.liveCustomerReleaseReady,false);
  assert.equal(r.activeDeployedScriptInspected,false);
  assert.equal(r.productionRelease,"BLOCKED");
 }finally{f.clean();}
});
test("638: development auth bridge and preview guards require review before production claims",()=>{
 const f=fixture("assets/js/security/development-auth-bridge.js");
 try{
  const r=inventoryPay54BrowserDevelopmentScripts(f.root);
  assert.equal(r.matches.length,1);
  assert.equal(r.matches[0].releaseClassification,
   "DEVELOPMENT_PREVIEW_ONLY_REQUIRES_SECURITY_REVIEW");
  assert.equal(r.previewOnlySecurityReviewRequired,true);
 }finally{f.clean();}
});
test("638: clean test HTML still does not authorise financial release",()=>{
 const f=fixture("assets/js/dashboard-blueprint-shell.js");
 try{
  const r=inventoryPay54BrowserDevelopmentScripts(f.root);
  assert.equal(r.liveCustomerReleaseReady,true);
  assert.equal(r.productionRelease,"BLOCKED");
 }finally{f.clean();}
});
