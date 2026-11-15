"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {PAY54_ACCOUNT_QUERIES,getAccountQuery,buildAccountQuery,identifyAccountQuery}
  from "../db/account-query-catalogue.mjs";
const P="11111111-1111-4111-8111-111111111111";
const A="22222222-2222-4222-8222-222222222222";

test("only three immutable account read statements are published",()=>{
 assert.deepEqual(Object.keys(PAY54_ACCOUNT_QUERIES).sort(),[
  "ACCOUNT_LIST","ACCOUNT_SELECT","PERSONAL_WALLET_IDS"
 ]);
 assert.ok(Object.isFrozen(PAY54_ACCOUNT_QUERIES));
 assert.throws(()=>getAccountQuery("__proto__"),/UNAPPROVED_ACCOUNT_QUERY/);
 for(const [id,sql] of Object.entries(PAY54_ACCOUNT_QUERIES)){
   assert.equal(getAccountQuery(id),sql);
   assert.equal(identifyAccountQuery(sql),id);
   assert.match(sql,/LIMIT 100/);
   assert.doesNotMatch(sql,/;\s*$/);
 }
});
test("parameter order and immutability are enforced by query identifier",()=>{
 const list=buildAccountQuery("ACCOUNT_LIST",P);
 const selected=buildAccountQuery("ACCOUNT_SELECT",P,A);
 const wallet=buildAccountQuery("PERSONAL_WALLET_IDS",P,A);
 assert.deepEqual(list.params,[P]);
 assert.deepEqual(selected.params,[P,A]);
 assert.deepEqual(wallet.params,[A,P]);
 for(const definition of [list,selected,wallet]){
   assert.ok(Object.isFrozen(definition));
   assert.ok(Object.isFrozen(definition.params));
 }
});
test("forged queries, missing principals and invalid parameters fail closed",()=>{
 assert.equal(identifyAccountQuery("DELETE FROM pay54.wallets"),null);
 assert.equal(identifyAccountQuery(PAY54_ACCOUNT_QUERIES.ACCOUNT_LIST+"; SELECT 1"),null);
 assert.equal(identifyAccountQuery(PAY54_ACCOUNT_QUERIES.ACCOUNT_LIST.replace("LIMIT 100","LIMIT 999")),null);
 assert.throws(()=>buildAccountQuery("ACCOUNT_LIST","bad"),/ACCOUNT_AUTH_REQUIRED/);
 assert.throws(()=>buildAccountQuery("ACCOUNT_LIST",P,A),/UNAPPROVED_ACCOUNT_QUERY/);
 assert.throws(()=>buildAccountQuery("ACCOUNT_SELECT",P),/UNAPPROVED_ACCOUNT_QUERY/);
 assert.throws(()=>buildAccountQuery("PERSONAL_WALLET_IDS",P,"bad"),/UNAPPROVED_ACCOUNT_QUERY/);
});
