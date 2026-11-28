"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {randomBytes,createHash} from "node:crypto";
import {createPay54DisposableFinancialGateway} from "../src/wave2/disposable-financial-gateway.mjs";
const accountId="a6700000-0000-4000-8000-000000000001";
const sourceAccountId="a6700000-0000-4000-8000-000000000301";
const destinationWalletId="a6700000-0000-4000-8000-000000000202";
const operationId="a6700000-0000-4000-8000-000000000901";
const authorization="Bearer "+randomBytes(32).toString("base64url");
const command={action:"RESERVE",accountId,sessionVersion:1,sourceAccountId,
 destinationWalletId,amountMinor:"100",idempotencyKey:"wave11-test-idempotency-01",
 requestDigest:"a".repeat(64)};
const role={db:"pay54_disposable_ci",role:"pay54_w7_disposable_caller",superuser:false,bypass:false};
function fixture({identity=role,failAt=null,rows=[{operation_id:operationId,outcome:"CREATED"}]}={}){
 const calls=[],client={
  async query(sql,params){
   calls.push({sql,params});
   if(failAt&&sql.includes(failAt))throw Error("sensitive backend exception");
   if(sql.startsWith("SELECT current_database()"))return {rows:[identity]};
   if(sql.includes("w7_disposable_attested_money"))return {rows};
   return {rows:[]};
  },
  release(){calls.push({sql:"RELEASE"});}
 };
 return {calls,client,pool:{connect:async()=>client}};
}
test("restricted transactional execution sends SHA256 raw bearer digest, never raw token",async()=>{
 const f=fixture();
 const api=createPay54DisposableFinancialGateway({pool:f.pool,environment:"DISPOSABLE_CI"});
 assert.deepEqual(await api.execute({authorization,command}),{operationId,outcome:"CREATED"});
 assert.equal(f.calls[0].sql,"BEGIN");
 assert.ok(f.calls[1].sql.includes("current_database()"));
 assert.equal(f.calls[2].params[0].toString("hex"),
  createHash("sha256").update(Buffer.from(authorization.slice(7),"base64url")).digest("hex"));
 assert.equal(f.calls[2].params[2],"1");
 assert.equal(f.calls[2].params[3],"RESERVE");
 assert.ok(!JSON.stringify(f.calls.map(x=>x.sql)).includes(authorization.slice(7)));
 assert.equal(f.calls[3].sql,"COMMIT");
 assert.equal(f.calls.at(-1).sql,"RELEASE");
});
test("missing secret or malformed financial instruction cannot open connection",async()=>{
 const f=fixture(),api=createPay54DisposableFinancialGateway({pool:f.pool,environment:"DISPOSABLE_CI"});
 for(const c of [{...command,amountMinor:"0"},{...command,amountMinor:"9223372036854775808"},
 {...command,sourceAccountId:accountId.slice(1)},{...command,requestDigest:"bad"},
 {...command,sessionVersion:0}]){
  await assert.rejects(api.execute({authorization,command:c}));
 }
 for(const v of ["Bearer invalid","Bearer "+randomBytes(12).toString("base64url"),""]){
  await assert.rejects(api.execute({authorization:v,command}));
 }
 assert.equal(f.calls.length,0);
});
test("wrong effective PG identity denies and rolls back without calling money writer",async()=>{
 for(const identity of [{...role,superuser:true},{...role,role:"postgres"},{...role,db:"pay54_staging"}]){
  const f=fixture({identity});
  const api=createPay54DisposableFinancialGateway({pool:f.pool,environment:"DISPOSABLE_CI"});
  await assert.rejects(api.execute({authorization,command}),/PAY54_W11_OPERATION_DENIED/);
  assert.ok(!f.calls.some(x=>x.sql.includes("w7_disposable_attested_money")));
  assert.equal(f.calls.at(-2).sql,"ROLLBACK");
  assert.equal(f.calls.at(-1).sql,"RELEASE");
 }
});
test("failed canonical execution always rolls back and redacts error",async()=>{
 const f=fixture({failAt:"w7_disposable_attested_money"});
 const api=createPay54DisposableFinancialGateway({pool:f.pool,environment:"DISPOSABLE_CI"});
 await assert.rejects(api.execute({authorization,command}),e=>{
  assert.equal(e.message,"PAY54_W11_OPERATION_DENIED");
  return true;
 });
 assert.equal(f.calls.at(-2).sql,"ROLLBACK");
 assert.equal(f.calls.at(-1).sql,"RELEASE");
});
test("capture and release go only through canonical bound wrapper",async()=>{
 for(const action of ["CAPTURE","RELEASE"]){
  const f=fixture({rows:[{operation_id:operationId,outcome:action==="CAPTURE"?"CAPTURED":"RELEASED"}]});
  const api=createPay54DisposableFinancialGateway({pool:f.pool,environment:"DISPOSABLE_CI"});
  const c={accountId,sessionVersion:1,action,operationId};
  if(action==="RELEASE")c.reason="CUSTOMER_CANCELLED";
  const result=await api.execute({authorization,command:c});
  assert.equal(result.operationId,operationId);
  assert.equal(f.calls[2].params[3],action);
  assert.equal(f.calls[2].params[9],operationId);
 }
});
test("production/staging environment is prohibited regardless of pool",()=>{
 for(const environment of ["PRODUCTION","STAGING","TEST",undefined])
  assert.throws(()=>createPay54DisposableFinancialGateway({
    pool:fixture().pool,environment
  }),/PAY54_W11_ENVIRONMENT_ADMISSION_DENIED/);
});
