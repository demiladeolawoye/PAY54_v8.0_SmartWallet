"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {probePay54PublicStaticHash as probe}
 from "../governance/pay54-batch27-public-static-hash-probe.mjs";
const source=Buffer.from("<!doctype html><html>PAY54 wallet</html>");
const digest=createHash("sha256").update(source).digest("hex");
test("1113: public GET returns only hashes and length, no HTML body",async()=>{
 const result=await probe({
  publicUrl:"https://getpay54.com/index.html",
  fetchPublic:async(url,options)=>{
   assert.equal(options.method,"GET");
   assert.equal(options.redirect,"manual");
   assert.equal(options.credentials,"omit");
   assert.equal(url,"https://getpay54.com/index.html");
   return new Response(source,{status:200});
  }
 });
 assert.equal(result.sha256,digest);
 assert.equal(JSON.stringify(result).includes("PAY54 wallet"),false);
 assert.equal(result.artifactReleaseAuthorised,false);
});
test("1113: private paths, remote exfiltration, redirects and overlarge bodies denied",async()=>{
 for(const url of [
  "https://getpay54.com/backend/src/server.mjs",
  "https://evil.example/index.html",
  "http://getpay54.com/index.html",
  "https://getpay54.com/index.html?secret=x",
  "https://getpay54.com/../backend/secrets"
 ])await assert.rejects(probe({publicUrl:url,fetchPublic:async()=>
  new Response(source,{status:200})}),/PUBLIC_STATIC_HASH_PROBE_DENIED/);
 await assert.rejects(probe({
  publicUrl:"https://getpay54.com/index.html",
  fetchPublic:async()=>new Response(source,{status:302})
 }),/PUBLIC_STATIC_HASH_PROBE_DENIED/);
 await assert.rejects(probe({
  publicUrl:"https://getpay54.com/index.html",
  fetchPublic:async()=>new Response(Buffer.alloc(5*1024*1024))
 }),/PUBLIC_STATIC_HASH_PROBE_DENIED/);
});
