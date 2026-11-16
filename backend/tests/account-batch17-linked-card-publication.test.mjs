"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {auditPay54LinkedCardReleaseDependency}
 from "../governance/pay54-linked-card-publication-dependency.mjs";

function fixture({includeProvider=true,reverse=false}={}){
 const root=mkdtempSync(join(tmpdir(),"pay54-card-release-review-"));
 mkdirSync(join(root,"assets/js/infrastructure/payments/providers"),{recursive:true});
 mkdirSync(join(root,"assets/js/engine/funding/adapters"),{recursive:true});
 mkdirSync(join(root,"assets/js/services"),{recursive:true});
 const provider="assets/js/infrastructure/payments/providers/linked-card-development.js";
 const adapter="assets/js/engine/funding/adapters/linked-card.js";
 const service="assets/js/services/funding.js";
 writeFileSync(join(root,provider),"export const testOnly=true;");
 writeFileSync(join(root,adapter),"export const adapter=true;");
 writeFileSync(join(root,service),"export const service=true;");
 writeFileSync(join(root,"index.html"),"<h1>Test</h1>");
 const scripts=(includeProvider?[provider,adapter,service]:[adapter,service]);
 if(reverse)scripts.reverse();
 writeFileSync(join(root,"dashboard.html"),
  "<html><body>"+scripts.map(x=>'<script src="'+x+'"></script>').join("")+"</body></html>");
 return {root,clean:()=>rmSync(root,{recursive:true,force:true})};
}
test("606: development card provider and dependency exclusion prevent public release",()=>{
 const f=fixture();
 try{
  const r=auditPay54LinkedCardReleaseDependency(f.root);
  assert.ok(r.issues.includes("DEVELOPMENT_CARD_PROVIDER_REFERENCED"));
  assert.ok(r.issues.includes("PROVIDER_EXCLUDED_BY_PUBLICATION_POLICY"));
  assert.ok(r.issues.includes("HTML_DEPENDENCY_MISSING_FROM_SAFE_CANDIDATE"));
  assert.equal(r.publicReleaseDependencySatisfied,false);
  assert.equal(r.cardFundingAvailableOnPublicSite,false);
  assert.equal(r.productionRelease,"BLOCKED");
 }finally{f.clean();}
});
test("606: no simulation script cannot be claimed as a working funding provider",()=>{
 const f=fixture({includeProvider:false});
 try{
  const r=auditPay54LinkedCardReleaseDependency(f.root);
  assert.ok(r.issues.includes("LINKED_CARD_ADAPTER_HAS_NO_PUBLIC_PROVIDER"));
  assert.equal(r.productionProviderContractVerified,false);
 }finally{f.clean();}
});
test("606: wrong script load order is explicitly flagged without rewriting the app",()=>{
 const f=fixture({reverse:true});
 try{
  const r=auditPay54LinkedCardReleaseDependency(f.root);
  assert.ok(r.issues.includes("FUNDING_PROVIDER_LOAD_ORDER_INVALID"));
  assert.equal(r.currentCustomerFunctionalityChanged,false);
 }finally{f.clean();}
});
