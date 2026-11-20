"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {collectPay54GithubReadOnlyEvidence as collect}
 from "../governance/pay54-batch27-github-readonly-collector.mjs";
const token="ghp_"+"x".repeat(40),api="https://api.github.com/repos/demiladeolawoye/PAY54_v8.0_SmartWallet";
const stub=({status=200,value={},onRequest=()=>{}}={})=>async(url,options)=>{
 onRequest(url,options);
 return new Response(JSON.stringify(value),{status});
};
test("1104: read-only pages API returns strict redacted metadata, never bearer token",async()=>{
 const x=await collect({endpoint:"pages",token,
  fetchRequest:stub({value:{status:"built",build_type:"workflow",
   cname:"getpay54.com",html_url:"https://getpay54.com/",
   source:null,token:"SHOULD_NOT_LEAK",secrets:["PRIVATE"]},
   onRequest:(url,opt)=>{
    assert.equal(url,api+"/pages");assert.equal(opt.method,"GET");
    assert.equal(opt.redirect,"manual");
    assert.equal(opt.headers.authorization,"Bearer "+token);
   }})});
 assert.equal(x.classification,"RESPONSE_OBSERVED");
 assert.equal(x.response.build_type,"workflow");
 assert.equal(JSON.stringify(x).includes("SHOULD_NOT_LEAK"),false);
 assert.equal(JSON.stringify(x).includes(token),false);
 assert.equal(x.authenticatedReviewerIdentityVerified,false);
});
test("1104: GitHub 403 is unknown, not absent protection",async()=>{
 const x=await collect({endpoint:"defaultBranchProtection",token,
  fetchRequest:stub({status:403,value:{message:"Resource not accessible"}})});
 assert.equal(x.permissionFailure,true);
 assert.equal(x.classification,"NOT_VERIFIED");
 assert.equal(x.response,null);
});
test("1104: read-only endpoint allowlist prevents SSRF, redirects, oversized JSON",async()=>{
 await assert.rejects(collect({endpoint:"https://evil.example",token,
  fetchRequest:stub()}),/GITHUB_READONLY_COLLECTION_DENIED/);
 await assert.rejects(collect({endpoint:"pages",token:"invalid",
  fetchRequest:stub()}),/GITHUB_READONLY_COLLECTION_DENIED/);
 await assert.rejects(collect({endpoint:"pages",token,
  fetchRequest:stub({value:{large:"z".repeat(256*1024)}})}),
  /GITHUB_READONLY_COLLECTION_DENIED/);
});
