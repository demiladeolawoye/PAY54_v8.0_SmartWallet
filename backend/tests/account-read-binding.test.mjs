"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountReadBinding} from "../db/account-read-binding.mjs";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {buildAccountQuery} from "../db/account-query-catalogue.mjs";
const P="11111111-1111-4111-8111-111111111111";
const A="22222222-2222-4222-8222-222222222222";
const trusted=createTrustedAccountPrincipalResolver({verifyServerSession:async request=>
 request.verified?{subjectId:P,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+3600}:null});
test("canonical binding executes only with opaque verified principal",async()=>{
 const requests=[];
 const binding=createAccountReadBinding({
  principalResolver:trusted,
  transaction:{execute:async value=>{requests.push(value);return {rows:[{account_id:A}]};}}
 });
 const result=await binding.query({verified:true},"ACCOUNT_SELECT",A);
 assert.deepEqual(result.rows,[{account_id:A}]);
 assert.ok(Object.isFrozen(result.rows[0]));
 assert.deepEqual(requests[0].params,[P,A]);
 assert.equal(requests[0].sql,buildAccountQuery("ACCOUNT_SELECT",P,A).sql);
});
test("missing authentication or unapproved query never reaches executor",async()=>{
 let calls=0;
 const binding=createAccountReadBinding({
  principalResolver:trusted,
  transaction:{execute:async()=>{calls++;return {rows:[]};}}
 });
 await assert.rejects(()=>binding.query({},"ACCOUNT_LIST"),/ACCOUNT_AUTH_REQUIRED/);
 await assert.rejects(()=>binding.query({verified:true},"DELETE_WALLETS"),/UNAPPROVED_ACCOUNT_QUERY/);
 await assert.rejects(()=>binding.query({verified:true},"ACCOUNT_SELECT","bad"),/UNAPPROVED_ACCOUNT_QUERY/);
 assert.equal(calls,0);
});
test("unavailable or oversized results deny rather than disclose",async()=>{
 const bad=createAccountReadBinding({principalResolver:trusted,
  transaction:{execute:async()=>({rows:Array.from({length:101},()=>({}))})}});
 await assert.rejects(()=>bad.query({verified:true},"ACCOUNT_LIST"),/ACCOUNT_RESULT_UNAVAILABLE/);
});
