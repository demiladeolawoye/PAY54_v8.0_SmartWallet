"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessPay54ProposedSiteContent}
 from "../governance/pay54-proposed-site-content-review.mjs";

test("284: safe proposed static bytes produce digest but no release approval",()=>{
 const result=assessPay54ProposedSiteContent({files:[
  {path:"index.html",content:"<!doctype html><title>PAY54</title>"},
  {path:"assets/js/app.js",content:"const app = 'PAY54';"}
 ]});
 assert.equal(result.candidateContentScreenPassed,true);
 assert.equal(result.findings.length,0);
 assert.match(result.candidateDigest,/^[a-f0-9]{64}$/);
 assert.equal(result.actualPagesContentInspected,false);
 assert.equal(result.independentSecretsScanCompleted,false);
 assert.equal(result.publicationApproved,false);
 assert.equal(result.productionRelease,"BLOCKED");
 assert.ok(Object.isFrozen(result.findings));
});
test("284: generic dummy secret and private key marker flagged without leak",()=>{
 const secretValue="synthetic-test-value-never-a-real-credential";
 const result=assessPay54ProposedSiteContent({files:[
  {path:"assets/js/app.js",content:
   "const client_secret = '"+secretValue+"';"},
  {path:"assets/css/secret.txt",content:
   "-----BEGIN PRIVATE KEY-----\nSyntheticNotARealKey"}
 ]});
 assert.equal(result.candidateContentScreenPassed,false);
 assert.ok(result.findings.some(x=>x.rule==="CREDENTIAL_ASSIGNMENT"));
 assert.ok(result.findings.some(x=>x.rule==="PRIVATE_KEY"));
 assert.equal(JSON.stringify(result).includes(secretValue),false);
 assert.equal(JSON.stringify(result).includes("SyntheticNotARealKey"),false);
});
test("284: HTTP scripts, database URLs and source map markers fail",()=>{
 const result=assessPay54ProposedSiteContent({files:[
  {path:"index.html",content:'<script src="http://test.invalid/a.js"></script>'},
  {path:"assets/js/bundle.js",content:"//# sourceMappingURL=bundle.js.map"},
  {path:"assets/js/data.js",content:"const u = 'postgres://demo:pass@localhost/db';"}
 ]});
 assert.equal(result.candidateContentScreenPassed,false);
 for(const name of ["HTTP_SCRIPT","DATABASE_URL","SOURCE_MAP_REFERENCE"]){
  assert.ok(result.findings.some(x=>x.rule===name));
 }
});
test("284: unsafe source path and duplicate manifest entry fail",()=>{
 const x=assessPay54ProposedSiteContent({files:[
  {path:"backend/src/unsafe.js",content:"hello"},
  {path:"index.html",content:"hi"},
  {path:"index.html",content:"hello"}
 ]});
 assert.equal(x.candidateContentScreenPassed,false);
 assert.deepEqual(x.disallowedPaths,["backend/src/unsafe.js"]);
});
test("284: binary/oversized payloads and unexpected fields fail closed",()=>{
 for(const invalid of [
  undefined,{files:[]},
  {files:[{path:"index.html",content:Buffer.from("hello")}]},
  {files:[{path:"index.html",content:"hi",authorization:true}]},
  {files:[{path:"index.html",content:"A".repeat(512*1024+1)}]}
 ]){
  assert.throws(()=>assessPay54ProposedSiteContent(invalid),
   /PAY54_SITE_CONTENT_(?:INVENTORY_INVALID|LIMIT)/);
 }
});
