"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createPay54FreshCommittedSessionFence as create}
 from "../src/fresh-committed-session-fence.mjs";
const SID="55555555-5555-4555-8555-555555555555";
const AID="22222222-2222-4222-8222-222222222222";
const PID="11111111-1111-4111-8111-111111111111";
const token=Buffer.alloc(32,7).toString("base64url");
const expected=()=>({sessionId:SID,principalId:PID,activeAccountId:AID,version:5});
function make({row,posture,throwAt}={}){
 let queries=[],released=[];
 const pool={connect:async()=>({
  query:async(sql,values)=>{
   queries.push({sql,values});
   if(throwAt&&sql.includes(throwAt))throw Error("PRIVATE_DB_PASSWORD");
   if(sql.startsWith("BEGIN")||sql==="ROLLBACK"||sql==="COMMIT")return {rows:[]};
   if(sql.includes("COUNT(*)::int AS table_count"))return {rows:[{
    runtime_role:"pay54_session_read_role",restricted:true,table_count:1,
    forced_rls:true,can_select:true,can_write:false,...posture
   }]};
   if(sql.includes("set_config("))return {rows:[{}]};
   return {rows:row===null?[]:[row??{...expected(),version:"5"}]};
  },
  release:discard=>released.push(discard)
 })};
 return {fence:create({pool}),queries,released};
}
const args=()=>({request:{headers:{authorization:"Bearer "+token}},expected:expected()});
test("new READ COMMITTED physical connection validates latest session",async()=>{
 const x=make();const v=await x.fence.verify(args());
 assert.equal(v.freshCommittedRead,true);
 assert.equal(v.atomicRevocationBarrierProven,false);
 assert.equal(v.productionAuthorised,false);
 assert.equal(x.queries[0].sql,"BEGIN ISOLATION LEVEL READ COMMITTED READ ONLY");
 assert.equal(x.queries.at(-1).sql,"COMMIT");
 assert.deepEqual(x.released,[false]);
});
for(const [name,config] of [
 ["revoked row absent",{row:null}],
 ["session switched",{row:{...expected(),activeAccountId:PID,version:"5"}}],
 ["version advanced",{row:{...expected(),version:"6"}}],
 ["untrusted role",{posture:{restricted:false}}],
 ["forced RLS missing",{posture:{forced_rls:false}}],
 ["reader write access",{posture:{can_write:true}}],
 ["database failure",{throwAt:"FROM pay54.auth_sessions"}]
]){
 test("fresh committed fence rejects "+name,async()=>{
  const x=make(config);
  await assert.rejects(x.fence.verify(args()),
   e=>e.message==="PAY54_FRESH_SESSION_FENCE_DENIED");
  assert.deepEqual(x.released,[true]);
  assert.equal(x.queries.at(-1).sql,"ROLLBACK");
 });
}
test("missing authenticated credential cannot trigger database checkout",async()=>{
 const x=make();
 await assert.rejects(x.fence.verify({
   request:{headers:{authorization:"Bearer invalid"}},expected:expected()
 }),/PAY54_FRESH_SESSION_FENCE_DENIED/);
 assert.equal(x.queries.length,0);
});
test("unconfigured pool and invalid session identity are denied",async()=>{
 assert.throws(()=>create(),/PAY54_FRESH_SESSION_FENCE_DENIED/);
 const x=make();
 await assert.rejects(x.fence.verify({...args(),expected:{...expected(),version:0}}),
 /PAY54_FRESH_SESSION_FENCE_DENIED/);
});
