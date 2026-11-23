"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createPay54RestrictedWalletAccountingReader as make}
 from "../src/restricted-wallet-accounting-reader.mjs";

const account="11111111-1111-4111-8111-111111111111";
const wallet="22222222-2222-4222-8222-222222222222";
const other="33333333-3333-4333-8333-333333333333";
const digest=Buffer.alloc(32,35);
function fixture({authOverrides={},rowOverrides={},roleOverrides={},failQuery}={}){
 const calls=[],discards=[];
 const auth={tokenDigest:Buffer.from(digest),accountId:account,
  walletId:wallet,currency:"GBP",active:true,...authOverrides};
 const role={role:"pay54_wallet_read_caller_role",login:"test-restricted-login",
   readonly:"on",isolation:"repeatable read",...roleOverrides};
 const row={accountId:account,walletId:wallet,currency:"GBP",
  postedMinor:"1000",heldMinor:"250",...rowOverrides};
 const client={
  async query(sql,params){
   calls.push({sql,params});
   if(failQuery&&sql.includes(failQuery))throw Error("NEVER_LOG_SECRET");
   if(sql.startsWith("BEGIN")||sql==="ROLLBACK")return {rows:[]};
   if(sql.includes("current_user"))return {rows:[role]};
   return {rows:[row]};
  },release:x=>discards.push(x)
 };
 const x=make({
  pool:{connect:async()=>client},
  trustedAuth:{resolve:async()=>auth}
 });
 return {x,calls,discards};
}
const request=()=>({request:{headers:{authorization:"Bearer represented-server-only"}},
 requestedAccountId:account,requestedWalletId:wallet,currency:"GBP"});
test("checks role and exact read-only query, returns unapproved accounting only",async()=>{
 const f=fixture();const result=await f.x.read(request());
 assert.equal(result.computedUnreservedMinor,"750");
 assert.equal(result.authorisedForCustomerDisplay,false);
 assert.equal(result.productionReady,false);
 assert.ok(Object.isFrozen(result));
 assert.deepEqual(f.discards,[true]);
 assert.equal(f.calls[0].sql,"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 assert.equal(f.calls.at(-1).sql,"ROLLBACK");
 const sql=f.calls.find(v=>v.sql.includes("wallet_read_restricted_v1"));
 assert.equal(sql.params.length,4);
 assert.deepEqual(sql.params[0],digest);
});
for(const [name,config] of [
 ["wrong database current role",{roleOverrides:{role:"postgres"}}],
 ["writable transaction",{roleOverrides:{readonly:"off"}}],
 ["weak transaction isolation",{roleOverrides:{isolation:"read committed"}}],
 ["owner login escalation",{roleOverrides:{login:"pay54_wallet_read_owner_role"}}],
 ["cross-tenant response",{rowOverrides:{accountId:other}}],
 ["cross-wallet response",{rowOverrides:{walletId:other}}],
 ["malformed minor unit",{rowOverrides:{heldMinor:"2.5"}}],
 ["negative minor unit",{rowOverrides:{postedMinor:"-2"}}],
 ["over-reservation",{rowOverrides:{heldMinor:"1001"}}],
 ["untrusted auth",{authOverrides:{active:false}}],
 ["mismatched principal context",{authOverrides:{walletId:other}}],
 ["invalid digest length",{authOverrides:{tokenDigest:Buffer.alloc(10)}}],
 ["database failure",{failQuery:"wallet_read_restricted_v1"}]
]){
 test("fails closed for "+name,async()=>{
  const f=fixture(config);
  await assert.rejects(f.x.read(request()),
   error=>error.message==="PAY54_WALLET_RESTRICTED_READ_UNAVAILABLE");
  if(f.calls.length)assert.deepEqual(f.discards,[true]);
 });
}
test("wrong account is rejected before any DB connection",async()=>{
 const f=fixture();
 await assert.rejects(f.x.read({...request(),requestedAccountId:other}),
  /PAY54_WALLET_RESTRICTED_READ_UNAVAILABLE/);
 assert.equal(f.calls.length,0);
});
test("raw thrown provider credentials never surface",async()=>{
 const f=fixture({failQuery:"current_user"});
 await assert.rejects(f.x.read(request()),
  error=>error.message==="PAY54_WALLET_RESTRICTED_READ_UNAVAILABLE");
 assert.deepEqual(f.discards,[true]);
});
test("Batch36 linked credential and session version are independently verified",async()=>{
 const f=fixture({authOverrides:{sessionId:"55555555-5555-4555-8555-555555555555",
  sessionVersion:2}});
 const expected={...request(),
  expectedTokenDigest:Buffer.from(digest),
  expectedSessionId:"55555555-5555-4555-8555-555555555555",
  expectedSessionVersion:2};
 assert.equal((await f.x.read(expected)).postedMinor,"1000");
 assert.deepEqual(f.discards,[true]);
});
test("Batch36 rejects session-token digest mismatch without issuing a SQL query",async()=>{
 const f=fixture({authOverrides:{sessionId:"55555555-5555-4555-8555-555555555555",
  sessionVersion:2}});
 await assert.rejects(f.x.read({...request(),
  expectedTokenDigest:Buffer.alloc(32,99),
  expectedSessionId:"55555555-5555-4555-8555-555555555555",
  expectedSessionVersion:2}),/PAY54_WALLET_RESTRICTED_READ_UNAVAILABLE/);
 assert.equal(f.calls.length,0);
});
test("Batch36 rejects stale session epoch and rejects partial binding",async()=>{
 const f=fixture({authOverrides:{sessionId:"55555555-5555-4555-8555-555555555555",
  sessionVersion:2}});
 for(const x of [
  {expectedTokenDigest:Buffer.from(digest),
   expectedSessionId:"55555555-5555-4555-8555-555555555555",
   expectedSessionVersion:3},
  {expectedTokenDigest:Buffer.from(digest)}
 ]){
  await assert.rejects(f.x.read({...request(),...x}),
    /PAY54_WALLET_RESTRICTED_READ_UNAVAILABLE/);
 }
 assert.equal(f.calls.length,0);
});
test("missing actual pool and trusted authority fails closed",()=>{
 assert.throws(()=>make(),/PAY54_WALLET_RESTRICTED_READ_UNAVAILABLE/);
});
