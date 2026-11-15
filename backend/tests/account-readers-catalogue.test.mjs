"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountContextReader} from "../domain/account-context-reader.mjs";
import {createAccountWalletReader} from "../domain/account-wallet-reader.mjs";
import {buildAccountQuery} from "../db/account-query-catalogue.mjs";
import {assertAccountReadStatement} from "../db/account-sql-policy.mjs";
const P="11111111-1111-4111-8111-111111111111";
const A="22222222-2222-4222-8222-222222222222";

test("all readers use the exact approved parameterized query templates",async()=>{
 const observed=[];
 const query=async(sql,params)=>{
  observed.push({sql,params});
  assert.equal(assertAccountReadStatement(sql,params,P),true);
  return {rows:[]};
 };
 const resolveAuthenticatedPrincipal=async()=>P;
 const accounts=createAccountContextReader({query,resolveAuthenticatedPrincipal});
 const wallets=createAccountWalletReader({query,resolveAuthenticatedPrincipal});
 assert.deepEqual(await accounts.listForRequest({}),[]);
 await assert.rejects(()=>accounts.selectForRequest({},A),/ACCOUNT_NOT_AVAILABLE/);
 assert.deepEqual(await wallets.eligibleWalletIds({},A),[]);
 assert.deepEqual(observed,[
  {sql:buildAccountQuery("ACCOUNT_LIST",P).sql,params:[P]},
  {sql:buildAccountQuery("ACCOUNT_SELECT",P,A).sql,params:[P,A]},
  {sql:buildAccountQuery("PERSONAL_WALLET_IDS",P,A).sql,params:[A,P]}
 ]);
});
test("non-approved query fragments cannot drift into canonical readers",()=>{
 const mutated=buildAccountQuery("ACCOUNT_LIST",P).sql+" FOR UPDATE";
 assert.throws(()=>assertAccountReadStatement(mutated,[P],P),/UNAPPROVED_ACCOUNT_QUERY/);
});
