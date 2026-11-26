"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createPay54WalletReadHandler} from "../src/wave2/wallet-read-handler.mjs";
const request={method:"GET",path:"/v1/wallets/read",headers:{authorization:"Bearer test"},
 query:{accountId:"a",walletId:"b",currency:"GBP"}};
test("GET returns a safe immutable presentation projection only",async()=>{
 let calls=0;
 const reader={async read(x){calls++;assert.equal(x.request,request);
 return {schema:"pay54.wave2.wallet-read-model.v1",wallets:[],
 financialExecutionEnabled:false,presentationOnly:true};}};
 const response=await createPay54WalletReadHandler({reader})(request);
 assert.equal(response.statusCode,200);assert.equal(response.headers["cache-control"],"no-store");
 assert.equal(JSON.parse(response.body).financialExecutionEnabled,false);
 assert.equal(calls,1);
});
test("wrong method, path, missing bearer, invalid service result deny",async()=>{
 let calls=0;
 const handler=createPay54WalletReadHandler({reader:{async read(){calls++;return {financialExecutionEnabled:true};}}});
 for(const req of [{...request,method:"POST"},{...request,path:"/v1/wallets/transfer"},
 {...request,headers:{}}]){
  const r=await handler(req);assert.equal(r.statusCode,404);
 }
 assert.equal(calls,0);
 assert.equal((await handler(request)).statusCode,404);
});
test("reader failure does not disclose session, identity or underlying SQL",async()=>{
 const handler=createPay54WalletReadHandler({reader:{async read(){throw Error("database details token secret");}}});
 const r=await handler(request);assert.equal(r.statusCode,404);
 assert.ok(!r.body.includes("token"));assert.ok(!r.body.includes("database"));
});
