"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createServer} from "node:http";
import {once} from "node:events";
import {createPay54AuthenticatedWalletReader,PAY54_W3_READ_SQL} from "../src/wave2/authenticated-wallet-reader.mjs";
import {createPay54WalletHttpListener} from "../src/wave2/wallet-http-listener.mjs";

const accountId="a0000000-0000-4000-8000-000000000001";
const walletId="b0000000-0000-4000-8000-000000000001";
const bearer="Bearer "+Buffer.alloc(32,41).toString("base64url");
const path="/v1/wallets/read?accountId="+accountId+"&walletId="+walletId+"&currency=GBP";
function poolFixture({role="pay54_wallet_read_caller_role",rows,broken=false}={}){
 const events=[];
 const source=rows??[{accountId,walletId,currency:"GBP",postedMinor:"11000",heldMinor:"3000"}];
 const pool={async connect(){events.push("connect");return {
  async query(sql,params){
   events.push(sql);
   if(sql.startsWith("BEGIN "))return {rows:[]};
   if(sql===PAY54_W3_READ_SQL.role)return {rows:[{runtime_role:role,read_only:"on"}]};
   if(sql===PAY54_W3_READ_SQL.fetch){
     assert.match(params[0],/^[a-f0-9]{64}$/);
     assert.deepEqual(params.slice(1),[accountId,walletId,"GBP"]);
     if(broken)throw Error("internal sensitive database error");
     return {rows:source};
   }
   return {rows:[]};
  },
  release(discard){events.push("release:"+(discard===true));}
 };}};
 return {pool,events};
}
async function withServer(listener,callback){
 const server=createServer((request,response)=>{
  Promise.resolve(listener(request,response)).catch(()=>{
    if(!response.headersSent)response.writeHead(500,{"cache-control":"no-store"});
    response.end();
  });
 });
 server.listen(0,"127.0.0.1");
 await once(server,"listening");
 try{return await callback("http://127.0.0.1:"+server.address().port);}
 finally{
  server.close();
  await once(server,"close");
 }
}
test("actual local HTTP GET -> bearer digest -> restricted SQL -> exact wallet result",async()=>{
 const f=poolFixture();
 const listener=createPay54WalletHttpListener({
  reader:createPay54AuthenticatedWalletReader({pool:f.pool})
 });
 await withServer(listener,async origin=>{
  const r=await fetch(origin+path,{headers:{authorization:bearer}});
  assert.equal(r.status,200);
  assert.match(r.headers.get("cache-control"),/no-store/);
  assert.equal(r.headers.get("vary"),"Authorization");
  assert.equal(r.headers.get("x-content-type-options"),"nosniff");
  const body=await r.json();
  assert.equal(body.wallets[0].availableMinor,"8000");
  assert.equal(body.wallets[0].canInitiateTransfer,false);
  assert.equal(body.financialExecutionEnabled,false);
  assert.equal(body.presentationOnly,true);
  assert.ok(!JSON.stringify(body).includes(bearer));
 });
 assert.deepEqual(f.events,[
  "connect","BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY",
  PAY54_W3_READ_SQL.role,PAY54_W3_READ_SQL.fetch,
  "COMMIT","release:false"
 ]);
});
test("non-read routes, duplicated query parameters and missing bearer are rejected before PG",async()=>{
 const f=poolFixture();
 const listener=createPay54WalletHttpListener({reader:createPay54AuthenticatedWalletReader({pool:f.pool})});
 await withServer(listener,async origin=>{
  const attempts=[
   {url:path,method:"POST",headers:{authorization:bearer}},
   {url:"/v1/wallets/transfer",headers:{authorization:bearer}},
   {url:path+"&currency=USD",headers:{authorization:bearer}},
   {url:path+"&principalId="+accountId,headers:{authorization:bearer}},
   {url:path,headers:{}},
   {url:path.replace("currency=GBP","currency=gbp"),headers:{authorization:bearer}}
  ];
  for(const a of attempts){
   const r=await fetch(origin+a.url,{method:a.method??"GET",headers:a.headers});
   assert.equal(r.status,404);
   assert.deepEqual(await r.json(),{error:"WALLET_NOT_AVAILABLE"});
  }
 });
 // Invalid currency reaches reader's pre-SQL validation, not connect().
 assert.equal(f.events.length,0);
});
test("wrong role, no wallet row or PG exception never leak internal identity",async()=>{
 for(const opts of [{role:"postgres"},{rows:[]},{broken:true}]){
  const f=poolFixture(opts);
  const listener=createPay54WalletHttpListener({reader:createPay54AuthenticatedWalletReader({pool:f.pool})});
  await withServer(listener,async origin=>{
   const r=await fetch(origin+path,{headers:{authorization:bearer}});
   assert.equal(r.status,404);
   const body=await r.text();
   assert.equal(body,JSON.stringify({error:"WALLET_NOT_AVAILABLE"}));
   assert.ok(!body.includes("database")&&!body.includes("token"));
  });
  assert.ok(f.events.includes("ROLLBACK"));
  assert.ok(f.events.includes("release:false"));
 }
});
