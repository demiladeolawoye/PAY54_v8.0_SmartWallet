"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readdirSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {assessPay54PublicSiteManifest}
 from "../governance/pay54-public-site-manifest.mjs";
import {inspectPay54StaticSiteCandidate}
 from "../governance/pay54-static-site-candidate-inventory.mjs";
import {inspectPay54PublicationReadiness}
 from "../governance/pay54-publication-source-readiness.mjs";
import {stagePay54SiteCandidate}
 from "../governance/pay54-static-site-stage-builder.mjs";

const forbidden=[
 "assets/js/infrastructure/payments/providers/linked-card-development.js",
 "assets/js/infra/mock.js",
 "assets/js/terraform/production.js"
];
test("600: public manifest forbids simulated infrastructure paths at any nested level",()=>{
 for(const path of forbidden){
  const r=assessPay54PublicSiteManifest({paths:["index.html",path]});
  assert.equal(r.sourceManifestStructurallySafe,false,path);
  assert.ok(r.disallowedPaths.includes(path),path);
 }
});
test("600: infrastructure can remain in repo but is never a public-site candidate",()=>{
 const root=mkdtempSync(join(tmpdir(),"pay54-publication-dependency-"));
 const site=join(root,"source"),stage=join(root,"stage");
 try{
  mkdirSync(join(site,"assets/js/infrastructure/payments/providers"),{recursive:true});
  mkdirSync(stage);
  writeFileSync(join(site,"index.html"),
   '<!doctype html><script src="assets/js/infrastructure/payments/providers/linked-card-development.js"></script>');
  writeFileSync(join(site,"assets/js/infrastructure/payments/providers/linked-card-development.js"),
   "export const simulated=true;");
  const inventory=inspectPay54StaticSiteCandidate(site);
  assert.deepEqual(inventory.candidatePaths,["index.html"]);
  assert.deepEqual(inventory.excludedSourcePaths,forbidden.slice(0,1));
  const readiness=inspectPay54PublicationReadiness(site);
  assert.equal(readiness.sourceDependencyStatus,"FAIL");
  assert.ok(readiness.issues.some(x=>
   x.category==="HTML_MISSING"&&
   x.resolved==="assets/js/infrastructure/payments/providers/linked-card-development.js"));
  assert.throws(()=>stagePay54SiteCandidate(site,stage),/PAY54_STAGE_LINK_REVIEW_FAILED/);
  assert.deepEqual(readdirSync(stage),[]);
 }finally{rmSync(root,{recursive:true,force:true});}
});
test("600: approved noninfra frontend assets remain eligible",()=>{
 const r=assessPay54PublicSiteManifest({
  paths:["index.html","dashboard.html","assets/js/dashboard-blueprint-shell.js",
   "assets/css/dashboard-blueprint-refinements.css"]
 });
 assert.equal(r.sourceManifestStructurallySafe,true);
 assert.equal(r.disallowedPaths.length,0);
});
