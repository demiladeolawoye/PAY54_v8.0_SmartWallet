"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {reviewPay54PublicPathEvidence}
 from "../governance/pay54-batch19-public-path-evidence.mjs";
const sha="a".repeat(64);
test("672: GET content hash comparison remains an unauthenticated local observation",()=>{
 const r=reviewPay54PublicPathEvidence({samples:[{
  path:"/PAY54_v8.0_SmartWallet/backend/index.js",
  method:"GET",status:200,responseSha256:sha,
  expectedArtifactSha256:sha,contentRetrievedAndReviewed:true
 }]});
 assert.equal(r.samples[0].verifiedContentMatch,true);
 assert.equal(r.currentDeploymentOriginAuthenticated,false);
 assert.equal(r.liveInternalSourceReachabilityConfirmed,false);
 assert.equal(r.incidentImpactAssessed,false);
 assert.equal(r.productionRelease,"BLOCKED");
});
test("672: HEAD 200 cannot establish content and a 404 cannot prove the site is safe",()=>{
 const r=reviewPay54PublicPathEvidence({samples:[
  {path:"/PAY54_v8.0_SmartWallet/backend/index.js",method:"HEAD",status:200},
  {path:"/PAY54_v8.0_SmartWallet/docs/example.md",method:"GET",status:404}
 ]});
 assert.ok(r.findings.includes("HEAD_200_IS_NOT_CONTENT_MATCH"));
 assert.ok(r.findings.includes("NEGATIVE_SAMPLE_IS_NOT_SITEWIDE_SAFETY_PROOF"));
 assert.equal(r.allInternalPathsProvenSafe,false);
});
test("672: GET 200 with no independently compared bytes cannot become verified proof",()=>{
 const r=reviewPay54PublicPathEvidence({samples:[{
  path:"/PAY54_v8.0_SmartWallet/backend/index.js",method:"GET",status:200
 }]});
 assert.equal(r.samples[0].verifiedContentMatch,false);
 assert.ok(r.findings.includes("HTTP_GET_WITHOUT_VERIFIED_ARTIFACT_DIGEST"));
});
test("672: unbounded, traversal and credential-bearing path metadata fail closed",()=>{
 for(const path of ["/../backend/index.js","/PAY54_v8.0_SmartWallet//backend/index.js",
  "/PAY54_v8.0_SmartWallet/token.js"]){
  assert.throws(()=>reviewPay54PublicPathEvidence({samples:[
   {path,method:"HEAD",status:200}
  ]}),/INVALID/);
 }
 assert.throws(()=>reviewPay54PublicPathEvidence({
  samples:Array.from({length:16},()=>({path:"/index.html",method:"HEAD",status:200}))
 }),/ARRAY_INVALID/);
});
