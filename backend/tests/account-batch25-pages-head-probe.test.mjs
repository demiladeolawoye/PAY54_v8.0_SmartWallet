"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {probePay54KnownPublicPages as probe}
 from "../governance/pay54-batch25-pages-head-probe.mjs";

test("976: HTTP HEAD 200 on backend source triggers exposure review not self-remediation",async()=>{
 const calls=[];
 const result=await probe({
  baseUrls:["https://getpay54.com/"],
  requestedAtMs:1800000000000,
  fetchHead:async(url,options)=>{
   calls.push({url,options});
   return {status:url.endsWith("/backend/src/server.mjs")?200:404};
  }
 });
 assert.equal(result.attemptedRequests,5);
 assert.equal(result.potentialExposureCount,1);
 assert.equal(result.noPublicExposureProven,false);
 assert.equal(result.currentDeployedArtifactHashVerified,false);
 assert.equal(result.productionOrSiteDeploymentAuthorised,false);
 for(const x of calls){
  assert.equal(x.options.method,"HEAD");
  assert.equal(x.options.redirect,"manual");
  assert.equal(x.options.credentials,"omit");
  assert.equal(x.options.cache,"no-store");
  assert.equal(x.url.startsWith("https://getpay54.com/"),true);
 }
});
test("976: remote network and permission failures remain NOT_VERIFIED",async()=>{
 const result=await probe({
  baseUrls:["https://getpay54.com/"],
  fetchHead:async(url)=>{
   if(url.endsWith("server.mjs"))throw Error("offline");
   return {status:403};
  }
 });
 assert.equal(result.potentialExposureCount,0);
 assert.equal(result.unverifiableCount,5);
 assert.equal(result.noPublicExposureProven,false);
});
test("976: all 404 observations are not proof of future public safety",async()=>{
 const result=await probe({
  baseUrls:["https://getpay54.com/"],
  fetchHead:async()=>({status:404})
 });
 assert.equal(result.potentialExposureCount,0);
 assert.equal(result.unverifiableCount,0);
 assert.equal(result.noPublicExposureProven,false);
 assert.equal(result.pagesConfigurationIndependentlyVerified,false);
});
test("976: remote attacker-controlled URLs and bogus statuses fail closed",async()=>{
 await assert.rejects(probe({
  baseUrls:["https://attacker.example/"],fetchHead:async()=>({status:404})
 }),/REMOTE_PAGES_PROBE_DENIED/);
 await assert.rejects(probe({
  baseUrls:["https://getpay54.com/"],
  fetchHead:async()=>({status:"200"})
 }),/REMOTE_PAGES_PROBE_DENIED/);
});
