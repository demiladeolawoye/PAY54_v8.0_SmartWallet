"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {collectPay54StackedPrEvidence as collect}
 from "../release/pay54-stacked-pr-collector.mjs";
const token="ghp_"+"z".repeat(40);
const rows=Array.from({length:16},(_,i)=>({
 number:i+1,state:"open",draft:true,merged_at:null,
 head:{ref:"cto/batch"+(i+13)+"-integration-branch",sha:String(i%10).repeat(40)},
 base:{ref:i===0?"project-titan":
  "cto/batch"+(i+12)+"-integration-branch"}
}));
const serve=(records=rows,status=200)=>async(url,request)=>{
 assert.ok(url.startsWith("https://api.github.com/repos/"));
 assert.equal(request.method,"GET");
 assert.equal(request.redirect,"manual");
 return new Response(JSON.stringify(records),{status});
};
test("1195: read-only actual PR topology collection never authorises a merge",async()=>{
 const r=await collect({accessToken:token,fetchRead:serve()});
 assert.equal(r.auditedPrCount,16);
 assert.equal(r.chainHasGaps,false);
 assert.equal(r.mergeAuthorised,false);
 assert.equal(JSON.stringify(r).includes(token),false);
});
test("1195: incomplete pagination and unauthorized responses cannot become approval",async()=>{
 await assert.rejects(collect({accessToken:token,
  fetchRead:serve(rows.slice(0,15))}),
  /STACKED_PR_COLLECTION_DENIED/);
 await assert.rejects(collect({accessToken:token,
  fetchRead:serve(rows,403)}),
  /STACKED_PR_COLLECTION_DENIED/);
 await assert.rejects(collect({accessToken:"bad",
  fetchRead:serve()}),/STACKED_PR_COLLECTION_DENIED/);
});
test("1195: modified PR chain cannot silently bypass draft or base rules",async()=>{
 const modified=rows.map((x,i)=>i===5?{...x,draft:false}:x);
 await assert.rejects(collect({accessToken:token,
  fetchRead:serve(modified)}),/STACKED_PR_COLLECTION_DENIED/);
});
