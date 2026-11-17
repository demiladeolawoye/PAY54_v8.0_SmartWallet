"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {derivePay54AccountCacheNamespace as derive}
 from "../governance/pay54-batch27-customer-cache-partition.mjs";
const x={principalId:"11111111-1111-4111-8111-111111111111",
 accountId:"22222222-2222-4222-8222-222222222222",
 sessionVersion:3,domain:"cards"};
test("1163: account and session versions must partition cache namespace",()=>{
 const r=derive(x);
 assert.notEqual(r.namespace,derive({...x,sessionVersion:4}).namespace);
 assert.notEqual(r.namespace,derive({...x,
  accountId:"33333333-3333-4333-8333-333333333333"}).namespace);
 assert.equal(r.localCacheActuallyCleared,false);
});
test("1163: unsupported financial data domain and malformed identity forbidden",()=>{
 assert.throws(()=>derive({...x,domain:"all-users"}),
 /ACCOUNT_CACHE_PARTITION_DENIED/);
 assert.throws(()=>derive({...x,accountId:"not-uuid"}),
 /ACCOUNT_CACHE_PARTITION_DENIED/);
});
