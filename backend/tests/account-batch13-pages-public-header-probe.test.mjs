"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {probePay54PagesPaths} from "../governance/pay54-pages-public-header-probe.mjs";

const baseUrl="https://demiladeolawoye.github.io/PAY54_v8.0_SmartWallet/";
test("393: HEAD-only request never downloads a body or follows redirects",async()=>{
 const calls=[];
 const head=async(url,options)=>{
  calls.push({url,options});
  return {status:200};
 };
 const result=await probePay54PagesPaths({
  baseUrl,paths:["backend/package.json","backend/tests/internal.mjs"],head
 });
 assert.equal(result.results.length,2);
 assert.equal(result.results[0].classification,"HTTP_SUCCESS_UNVERIFIED_BODY");
 assert.equal(result.bodyDownloaded,false);
 assert.equal(result.secretsExposureConfirmed,false);
 assert.equal(result.productionRelease,"BLOCKED");
 assert.ok(calls.every(c=>c.options.method==="HEAD"&&c.options.redirect==="manual"));
 assert.ok(calls.every(c=>!c.options.headers.Authorization));
});
test("393: 404 cannot be interpreted as proof of deployment safety",async()=>{
 const result=await probePay54PagesPaths({
  baseUrl,paths:["backend/package.json"],head:async()=>({status:404})
 });
 assert.equal(result.results[0].classification,"HTTP_404");
 assert.equal(result.pagesSourceSettingsVerified,false);
 assert.equal(result.productionRelease,"BLOCKED");
});
test("393: remote redirects are not followed",async()=>{
 const result=await probePay54PagesPaths({
  baseUrl,paths:["backend/test.mjs"],head:async()=>({status:302})
 });
 assert.equal(result.results[0].classification,"REDIRECT_NOT_FOLLOWED");
});
test("393: origin mismatch and path tricks are refused before network",async()=>{
 let calls=0;
 const head=async()=>{calls++;return {status:200};};
 for(const invalidBase of [
  "http://demiladeolawoye.github.io/PAY54_v8.0_SmartWallet/",
  "https://example.org/PAY54_v8.0_SmartWallet/",
  "https://demiladeolawoye.github.io/another/",
  "https://user:pass@demiladeolawoye.github.io/PAY54_v8.0_SmartWallet/"
 ]){
  await assert.rejects(probePay54PagesPaths({
   baseUrl:invalidBase,paths:["backend/a.mjs"],head
  }),/PAY54_PAGES_ORIGIN_DENIED/);
 }
 for(const badPath of [
  "../secret",".","/backend/config.js","backend/x?token=1",
  "backend/%2e%2e/secret","backend\\secret","//evil.example/x"
 ]){
  await assert.rejects(probePay54PagesPaths({
   baseUrl,paths:[badPath],head
  }),/PAY54_PAGES_PROBE_PATH_DENIED/);
 }
 assert.equal(calls,0);
});
test("393: unavailable network is explicitly inconclusive",async()=>{
 const result=await probePay54PagesPaths({
  baseUrl,paths:["backend/file.mjs"],head:async()=>{throw new Error("network unavailable");}
 });
 assert.equal(result.results[0].classification,"REQUEST_FAILED");
 assert.equal(result.secretsExposureConfirmed,false);
});
