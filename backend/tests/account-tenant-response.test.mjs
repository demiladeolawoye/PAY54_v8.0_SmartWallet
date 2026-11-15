"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTenantDisplayResponse} from "../http/account-tenant-response.mjs";
const A="11111111-1111-4111-8111-111111111111";
const row={accountId:A,type:"PERSONAL",displayName:"Personal",financialExecutionEnabled:false};
test("account label response includes strict origin/cache policy without financial data",()=>{
 const response=createTenantDisplayResponse({accounts:[row],financialExecutionEnabled:false});
 assert.equal(response.status,200);
 assert.equal(response.headers["Cache-Control"],"no-store, private");
 assert.equal(response.headers["Access-Control-Allow-Origin"],undefined);
 assert.deepEqual(JSON.parse(response.body),{accounts:[{accountId:A,type:"PERSONAL",displayName:"Personal"}],
  financialExecutionEnabled:false});
});
test("extra balance/card/token information or mismatched account structure fails closed",()=>{
 for(const accounts of [
  [{...row,balance:100}],
  [{...row,token:"private"}],
  [{...row,financialExecutionEnabled:true}],
  [row,row],
  [{...row,accountId:"invalid"}]
 ])assert.throws(()=>createTenantDisplayResponse({accounts,financialExecutionEnabled:false}),
  /ACCOUNT_RESPONSE_UNAVAILABLE/);
 assert.throws(()=>createTenantDisplayResponse({accounts:[row],financialExecutionEnabled:true}),
  /ACCOUNT_RESPONSE_UNAVAILABLE/);
});
