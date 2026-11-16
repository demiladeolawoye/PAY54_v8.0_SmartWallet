"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {runInNewContext} from "node:vm";

const code=readFileSync(fileURLToPath(
 new URL("../../assets/js/core/preview-claims-guard.js",import.meta.url)
),"utf8");
const selectors=[".balance-meta",".balance-delta",".identity",".trust-chip"];
function mount(publicPreview){
 const nodes=new Map(selectors.map(selector=>[
  selector,{textContent:"Unsupported old claim",children:[]}
 ]));
 const document={
  readyState:"complete",
  querySelectorAll:selector=>nodes.has(selector)?[nodes.get(selector)]:[],
  querySelector:selector=>nodes.get(selector)??null
 };
 const window={
  PAY54_DEPLOYMENT_BOUNDARY:{
   assess:()=>({
    classification:publicPreview?"PUBLIC_DEVELOPMENT_PREVIEW":"PRODUCTION",
    publicPreviewHost:publicPreview
   })
  }
 };
 runInNewContext(code,{window,document,console:{info:()=>{}}});
 return {nodes,api:window.PAY54_PREVIEW_CLAIMS_GUARD};
}
test("574: public preview guard shows four demo-safe account and balance disclosures",()=>{
 const {nodes,api}=mount(true);
 assert.equal(api.version,"1.0.1");
 assert.equal(api.health().rules,4);
 assert.match(nodes.get(".balance-meta").textContent,/security not verified/i);
 assert.match(nodes.get(".balance-meta").textContent,/Across wallets/);
 assert.match(nodes.get(".balance-delta").textContent,/\+₦24,500 today/);
 assert.match(nodes.get(".balance-delta").textContent,/sample movement \(not verified\)/);
 assert.match(nodes.get(".identity").textContent,/3001234567/);
 assert.match(nodes.get(".identity").textContent,/@pay54-user/);
 assert.match(nodes.get(".identity").textContent,/KYC: Level 2 sample \(unverified\)/);
 assert.match(nodes.get(".trust-chip").textContent,/demonstration only — not verified/);
 assert.equal(api.health().financialStorageWrites,0);
 assert.equal(api.health().financialExecutionAuthority,false);
 assert.equal(api.inspect().every(x=>x.compliant),true);
});

test("574: reapplying preview guard is idempotent and does not rewrite claims repeatedly",()=>{
 const {api}=mount(true);
 const again=api.apply();
 assert.equal(again.applied,true);
 assert.equal(again.elementsUpdated,0);
});

test("574: nonpublic environment does not rewrite account or status text",()=>{
 const {nodes,api}=mount(false);
 for(const selector of selectors){
  assert.equal(nodes.get(selector).textContent,"Unsupported old claim");
 }
 const r=api.apply();
 assert.equal(r.applied,false);
 assert.equal(r.reason,"NOT_PUBLIC_DEVELOPMENT_PREVIEW");
 assert.equal(r.elementsUpdated,0);
});
