"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createPay54PostgresPayTagRegistrationExecutor,
 PAY54_PAYTAG_REGISTER_ROLE_SQL,PAY54_PAYTAG_REGISTER_SQL,
 PAY54_PAYTAG_REGISTRATION_EXECUTOR_POSTURE} from "../src/postgres-paytag-registration-executor.mjs";

const NOW=1800000000000;
const UUIDS=[
 "11111111-1111-4111-8111-111111111111",
 "22222222-2222-4222-8222-222222222222",
 "33333333-3333-4333-8333-333333333333",
 "44444444-4444-4444-8444-444444444444",
 "55555555-5555-4555-8555-555555555555"
];
const token=n=>Buffer.alloc(32,n).toString("base64url");
const request=()=>({
 requestContext:{headers:{
  authorization:"Bearer "+token(1),origin:"https://app.getpay54.com",
  "x-pay54-csrf":token(2),"idempotency-key":token(3)
 }},
 requestPayload:{proposedTag:"@customer_tag"}
});
const session={sessionId:UUIDS[0],principalId:UUIDS[1],
 activeAccountId:UUIDS[2],status:"ACTIVE",version:2,
 issuedAtMs:NOW-300000,expiresAtMs:NOW+300000};
const role={
 role_name:"pay54_paytag_register_role",restricted:true,may_register:true,
 may_write_registry:false,may_write_audit:false,may_write_idempotency:false,
 may_write_ledger:false,may_write_sessions:false
};
function fixture({posture=role,registerResult={tagId:UUIDS[3],
 requestId:UUIDS[4],replayed:false},failOn=null,commitFails=false}={}){
 const queries=[];
 let discarded;
 const client={
  async query(sql,params){
   queries.push({sql,params});
   if(sql===failOn)throw Error("database unavailable");
   if(sql===PAY54_PAYTAG_REGISTER_ROLE_SQL)return {rows:[posture]};
   if(sql===PAY54_PAYTAG_REGISTER_SQL)return {rows:[registerResult]};
   if(sql==="COMMIT"&&commitFails)throw Error("uncertain commit");
   return {rows:[]};
  },
  release(dispose){discarded=dispose;}
 };
 const pool={connect:async()=>client};
 const executor=createPay54PostgresPayTagRegistrationExecutor({
  writePool:pool,resolveAuthenticatedSession:async()=>session,
  trustedApplicationOrigin:"https://app.getpay54.com",
  idempotencyHmacKey:Buffer.alloc(32,7),getTrustedServerTimeMs:()=>NOW,
  newId:(()=>{let i=0;return()=>UUIDS[4-(i++%2)];})()
 });
 return {executor,queries,get discarded(){return discarded;}};
}

test("no public or production feature activation exists",()=>{
 assert.equal(PAY54_PAYTAG_REGISTRATION_EXECUTOR_POSTURE.httpRouteEnabled,false);
 assert.equal(PAY54_PAYTAG_REGISTRATION_EXECUTOR_POSTURE.writerFunctionProvisioned,false);
 assert.equal(PAY54_PAYTAG_REGISTRATION_EXECUTOR_POSTURE.financialExecutionEnabled,false);
 assert.match(PAY54_PAYTAG_REGISTER_SQL,/register_paytag_trusted/);
});
test("trusted role function call uses digest-only parameters under serializable transaction",async()=>{
 const f=fixture();
 const r=await f.executor(request());
 assert.equal(r.paymentAuthorised,false);
 assert.equal(r.productionHttpRouteActivated,false);
 assert.equal(r.replayed,false);
 assert.equal(Object.isFrozen(r),true);
 assert.equal(f.queries[0].sql,"BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");
 const call=f.queries.find(q=>q.sql===PAY54_PAYTAG_REGISTER_SQL);
 assert.ok(call);
 assert.equal(call.params.length,11);
 for(const i of [0,1,7,8]){
  assert.ok(Buffer.isBuffer(call.params[i]));
  assert.equal(call.params[i].length,32);
 }
 assert.equal(call.params[6],"customer_tag");
 assert.equal(f.queries.at(-1).sql,"COMMIT");
 assert.equal(f.discarded,false);
});
test("unauthenticated/forged request never starts DB transaction",async()=>{
 const f=fixture();
 const req=request();req.requestPayload.accountId=UUIDS[3];
 await assert.rejects(()=>f.executor(req),/PAY54_PAYTAG_REGISTRATION_UNAVAILABLE/);
 assert.equal(f.queries.length,0);
});
test("wrong, privileged or bypass-RLS connection denied and rolled back",async()=>{
 for(const patch of [
  {role_name:"pay54_financial_app_role"},
  {restricted:false},{may_register:false},{may_write_registry:true},
  {may_write_audit:true},{may_write_idempotency:true},
  {may_write_ledger:true},{may_write_sessions:true}
 ]){
  const f=fixture({posture:{...role,...patch}});
  await assert.rejects(()=>f.executor(request()),/PAY54_PAYTAG_REGISTRATION_UNAVAILABLE/);
  assert.equal(f.queries.at(-1).sql,"ROLLBACK");
  assert.equal(f.discarded,false);
 }
});
test("unavailable database function rejects without any mutation or success",async()=>{
 const f=fixture({failOn:PAY54_PAYTAG_REGISTER_ROLE_SQL});
 await assert.rejects(()=>f.executor(request()),/PAY54_PAYTAG_REGISTRATION_UNAVAILABLE/);
 assert.equal(f.queries.at(-1).sql,"ROLLBACK");
});
test("invalid SQL result is rejected and rollback applied",async()=>{
 for(const result of [
  {tagId:"invalid",requestId:UUIDS[4],replayed:false},
  {tagId:UUIDS[3],requestId:UUIDS[4],replayed:"false"},
  {tagId:UUIDS[3],requestId:UUIDS[0],replayed:false}
 ]){
  const f=fixture({registerResult:result});
  await assert.rejects(()=>f.executor(request()),/PAY54_PAYTAG_REGISTRATION_UNAVAILABLE/);
  assert.equal(f.queries.at(-1).sql,"ROLLBACK");
 }
});
test("uncertain commit discards connection and never returns success",async()=>{
 const f=fixture({commitFails:true});
 await assert.rejects(()=>f.executor(request()),/PAY54_PAYTAG_REGISTRATION_UNAVAILABLE/);
 assert.equal(f.discarded,true);
});
