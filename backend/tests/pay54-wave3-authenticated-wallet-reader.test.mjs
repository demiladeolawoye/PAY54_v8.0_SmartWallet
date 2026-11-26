"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createPay54AuthenticatedWalletReader,PAY54_W3_READ_SQL}
 from "../src/wave2/authenticated-wallet-reader.mjs";
const accountId="a0000000-0000-4000-8000-000000000001";
const walletId="b0000000-0000-4000-8000-000000000001";
const token=Buffer.alloc(32,41).toString("base64url");
const request={headers:{authorization:"Bearer "+token}};
function fixture({role="pay54_wallet_read_caller_role",readOnly="on",
 rows=[{accountId,walletId,currency:"GBP",postedMinor:"10000",heldMinor:"2500"}],
 failCommit=false,failRollback=false}={}){
 const log=[];const released=[];
 const client={
  async query(sql,params){
   log.push({sql,params});
   if(sql==="BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY")return {rows:[]};
   if(sql===PAY54_W3_READ_SQL.role)return {rows:[{runtime_role:role,read_only:readOnly}]};
   if(sql===PAY54_W3_READ_SQL.fetch)return {rows};
   if(sql==="COMMIT"&&failCommit)throw Error("commit failed");
   if(sql==="ROLLBACK"&&failRollback)throw Error("rollback failed");
   return {rows:[]};
  },
  release(discard){released.push(discard??false);}
 };
 return {pool:{async connect(){return client;}},log,released};
}
const args={request,accountId,walletId,currency:"GBP"};
test("authenticated canonical PostgreSQL wallet read is safe and read-only",async()=>{
 const f=fixture();const reader=createPay54AuthenticatedWalletReader({pool:f.pool});
 const result=await reader.read(args);
 assert.equal(result.wallets[0].availableMinor,"7500");
 assert.equal(result.wallets[0].canInitiateTransfer,false);
 assert.equal(result.financialExecutionEnabled,false);
 assert.deepEqual(f.log.map(x=>x.sql),[
  "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY",
  PAY54_W3_READ_SQL.role,PAY54_W3_READ_SQL.fetch,"COMMIT"
 ]);
 const binds=f.log[2].params;
 assert.match(binds[0],/^[a-f0-9]{64}$/);
 assert.equal(binds[1],accountId);assert.equal(binds[2],walletId);
 assert.equal(binds[3],"GBP");
 assert.deepEqual(f.released,[false]);
});
test("incorrect role and missing wallet deny without financial access",async()=>{
 for(const f of [fixture({role:"postgres"}),fixture({readOnly:"off"}),fixture({rows:[]})]){
  await assert.rejects(createPay54AuthenticatedWalletReader({pool:f.pool}).read(args),
   /PAY54_W3_WALLET_READ_DENIED/);
  assert.equal(f.log.at(-1).sql,"ROLLBACK");
  assert.deepEqual(f.released,[false]);
 }
});
test("cross-wallet and inconsistent held amounts fail closed",async()=>{
 for(const rows of [[{accountId,walletId:accountId,currency:"GBP",postedMinor:"100",heldMinor:"0"}],
 [{accountId,walletId,currency:"GBP",postedMinor:"100",heldMinor:"101"}]]){
 const f=fixture({rows});
 await assert.rejects(createPay54AuthenticatedWalletReader({pool:f.pool}).read(args),
 /PAY54_W3_WALLET_READ_DENIED/);
 assert.equal(f.log.at(-1).sql,"ROLLBACK");
 }
});
test("invalid bearer and client identity never reach PostgreSQL",async()=>{
 for(const candidate of [
 {...args,request:{headers:{authorization:"Bearer invalid"}}},
 {...args,currency:"gbp"},{...args,walletId:"bad"}
 ]){
 const f=fixture();
 await assert.rejects(createPay54AuthenticatedWalletReader({pool:f.pool}).read(candidate),
 /PAY54_W3_WALLET_READ_DENIED/);
 assert.equal(f.log.length,0);
 }
});
test("failed transaction rollback disposes connection",async()=>{
 const f=fixture({rows:[],failRollback:true});
 await assert.rejects(createPay54AuthenticatedWalletReader({pool:f.pool}).read(args),
 /PAY54_W3_WALLET_READ_DENIED/);
 assert.deepEqual(f.released,[true]);
});
test("failed commit never returns an authoritative snapshot",async()=>{
 const f=fixture({failCommit:true});
 await assert.rejects(createPay54AuthenticatedWalletReader({pool:f.pool}).read(args),
 /PAY54_W3_WALLET_READ_DENIED/);
 assert.ok(f.log.some(x=>x.sql==="ROLLBACK"));
});
