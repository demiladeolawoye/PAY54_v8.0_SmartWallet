"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
 createPay54RestrictedRegistrationPreview,
 PAY54_PAYTAG_RESTRICTED_ROLE_SQL,
 PAY54_PAYTAG_RESTRICTED_CALL_SQL,
 PAY54_PAYTAG_RESTRICTED_PREVIEW_POSTURE
} from "../src/paytag-restricted-registration-preview.mjs";

const NOW=1800000000000;
const IDS=[
 "11111111-1111-4111-8111-111111111111",
 "22222222-2222-4222-8222-222222222222",
 "33333333-3333-4333-8333-333333333333",
 "44444444-4444-4444-8444-444444444444",
 "55555555-5555-4555-8555-555555555555"
];
const token=n=>Buffer.alloc(32,n).toString("base64url");
const session={
 sessionId:IDS[0],principalId:IDS[1],activeAccountId:IDS[2],
 status:"ACTIVE",version:2,issuedAtMs:NOW-300000,expiresAtMs:NOW+300000
};
const posture={
 role_name:"pay54_paytag_register_role",role_restricted:true,
 can_call_wrapper:true,can_call_writer:false,
 sessions_access:false,registry_access:false,
 idempotency_access:false,audit_access:false,
 ledger_access:false,role_has_membership:false
};
const request=()=>({
 requestContext:{headers:{
  authorization:"Bearer "+token(1),
  origin:"https://app.getpay54.com",
  "x-pay54-csrf":token(2),
  "idempotency-key":token(3)
 }},
 requestPayload:{proposedTag:"@pay54_safe_test"}
});
function setup({role=posture,rows=[{tagId:IDS[3],requestId:IDS[4],replayed:false}],
 failOn=null,commitFailure=false,rollbackFailure=false,
 resolver=async()=>session,clientOverride=null}={}){
 const queries=[];
 const releases=[];
 let connects=0;
 const client=clientOverride??{
  async query(sql,params){
   queries.push({sql,params});
   if(sql===failOn)throw Error("database unavailable");
   if(sql==="COMMIT"&&commitFailure)throw Error("commit uncertain");
   if(sql==="ROLLBACK"&&rollbackFailure)throw Error("rollback unknown");
   if(sql===PAY54_PAYTAG_RESTRICTED_ROLE_SQL)return {rows:[role]};
   if(sql===PAY54_PAYTAG_RESTRICTED_CALL_SQL)return {rows};
   return {rows:[]};
  },
  release(value){releases.push(value);}
 };
 const preview=createPay54RestrictedRegistrationPreview({
  environment:"disposable-test",
  connectDisposableClient:async()=>{connects++;return client;},
  resolveAuthenticatedSession:resolver,
  trustedApplicationOrigin:"https://app.getpay54.com",
  idempotencyHmacKey:Buffer.alloc(32,7),
  getTrustedServerTimeMs:()=>NOW,
  newId:(()=>{let i=0;return()=>[IDS[4],IDS[3]][i++%2];})()
 });
 return {preview,queries,releases,get connects(){return connects;}};
}
test("posture is immutable and never enables HTTP, persistence or financial execution",()=>{
 assert.equal(PAY54_PAYTAG_RESTRICTED_PREVIEW_POSTURE.httpRouteEnabled,false);
 assert.equal(PAY54_PAYTAG_RESTRICTED_PREVIEW_POSTURE.liveDbConnectorProvisioned,false);
 assert.equal(PAY54_PAYTAG_RESTRICTED_PREVIEW_POSTURE.productionEnabled,false);
 assert.match(PAY54_PAYTAG_RESTRICTED_CALL_SQL,/register_paytag_restricted/);
 assert.doesNotMatch(PAY54_PAYTAG_RESTRICTED_CALL_SQL,/register_paytag_trusted/);
 assert.equal(Object.isFrozen(PAY54_PAYTAG_RESTRICTED_PREVIEW_POSTURE),true);
});
test("strict environment and missing dependency rejected at constructor",()=>{
 for(const environment of ["production","staging","test",undefined]){
  assert.throws(()=>createPay54RestrictedRegistrationPreview({
   environment,connectDisposableClient:async()=>null,
   resolveAuthenticatedSession:async()=>session,
   trustedApplicationOrigin:"https://app.getpay54.com",
   idempotencyHmacKey:Buffer.alloc(32,7)
  }),/PAY54_PAYTAG_RESTRICTED_PREVIEW_UNAVAILABLE/);
 }
 assert.throws(()=>createPay54RestrictedRegistrationPreview({
  environment:"disposable-test",connectDisposableClient:undefined,
  resolveAuthenticatedSession:async()=>session
 }),/PAY54_PAYTAG_RESTRICTED_PREVIEW_UNAVAILABLE/);
});
test("authenticated parameterised restricted registration, commit then discard",async()=>{
 const f=setup();
 const result=await f.preview(request());
 assert.equal(result.tagId,IDS[3]);
 assert.equal(result.requestId,IDS[4]);
 assert.equal(result.customerRegistrationEnabled,false);
 assert.equal(result.productionRelease,"BLOCKED");
 assert.equal(Object.isFrozen(result),true);
 assert.deepEqual(f.releases,[true]);
 assert.equal(f.queries[0].sql,"BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");
 assert.equal(f.queries.at(-1).sql,"COMMIT");
 const q=f.queries.find(x=>x.sql===PAY54_PAYTAG_RESTRICTED_CALL_SQL);
 assert.equal(q.params.length,11);
 assert.equal(q.params[6],"pay54_safe_test");
 assert.equal(q.params[3],2);
 assert.ok(q.params.every((v,i)=>![0,1,7,8].includes(i)||Buffer.isBuffer(v)));
 // Values are disposed after query; never leak secrets to logging.
 for(const i of [0,1,7,8])assert.deepEqual(q.params[i],Buffer.alloc(32));
});
test("forged body and failed session validation never reach DB",async()=>{
 const f=setup();
 const bad=request();
 bad.requestPayload.accountId=IDS[3];
 await assert.rejects(()=>f.preview(bad),/PAY54_PAYTAG_RESTRICTED_PREVIEW_UNAVAILABLE/);
 assert.equal(f.connects,0);
 const expired=setup({resolver:async()=>({...session,status:"REVOKED"})});
 await assert.rejects(()=>expired.preview(request()),/PAY54_PAYTAG_RESTRICTED_PREVIEW_UNAVAILABLE/);
 assert.equal(expired.connects,0);
});
test("role drift, direct DML or function bypass denied before SQL writer",async()=>{
 for(const change of [
  {role_name:"postgres"},{role_restricted:false},
  {can_call_wrapper:false},{can_call_writer:true},
  {sessions_access:true},{registry_access:true},
  {idempotency_access:true},{audit_access:true},
  {ledger_access:true},{role_has_membership:true}
 ]){
  const f=setup({role:{...posture,...change}});
  await assert.rejects(()=>f.preview(request()),/PAY54_PAYTAG_RESTRICTED_PREVIEW_UNAVAILABLE/);
  assert.deepEqual(f.releases,[true]);
  assert.equal(f.queries.some(q=>q.sql===PAY54_PAYTAG_RESTRICTED_CALL_SQL),false);
  assert.equal(f.queries.at(-1).sql,"ROLLBACK");
 }
});
test("SQL error and invalid return never commit",async()=>{
 for(const options of [
  {failOn:PAY54_PAYTAG_RESTRICTED_CALL_SQL},
  {rows:[{tagId:"invalid",requestId:IDS[4],replayed:false}]},
  {rows:[{tagId:IDS[3],requestId:IDS[0],replayed:false}]},
  {rows:[{tagId:IDS[3],requestId:IDS[4],replayed:"false"}]},
  {rows:[]}
 ]){
  const f=setup(options);
  await assert.rejects(()=>f.preview(request()),/PAY54_PAYTAG_RESTRICTED_PREVIEW_UNAVAILABLE/);
  assert.equal(f.queries.at(-1).sql,"ROLLBACK");
  assert.deepEqual(f.releases,[true]);
 }
});
test("uncertain commit never retries, leaks success or returns a receipt",async()=>{
 const f=setup({commitFailure:true});
 await assert.rejects(()=>f.preview(request()),/PAY54_PAYTAG_RESTRICTED_PREVIEW_UNAVAILABLE/);
 assert.equal(f.queries.filter(q=>q.sql==="COMMIT").length,1);
 assert.equal(f.queries.some(q=>q.sql==="ROLLBACK"),false);
 assert.deepEqual(f.releases,[true]);
 assert.equal(f.connects,1);
});
test("rollback failure still quarantines physical session",async()=>{
 const f=setup({failOn:PAY54_PAYTAG_RESTRICTED_CALL_SQL,rollbackFailure:true});
 await assert.rejects(()=>f.preview(request()),/PAY54_PAYTAG_RESTRICTED_PREVIEW_UNAVAILABLE/);
 assert.deepEqual(f.releases,[true]);
});
test("precheckout rejected connection fails closed",async()=>{
 const f=setup({clientOverride:{query:null,release:()=>{}}});
 await assert.rejects(()=>f.preview(request()),/PAY54_PAYTAG_RESTRICTED_PREVIEW_UNAVAILABLE/);
});
