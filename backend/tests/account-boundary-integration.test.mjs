"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountReadTransaction} from "../db/account-read-transaction.mjs";
import {createAccountReadBinding} from "../db/account-read-binding.mjs";
import {assertAccountReadStatement} from "../db/account-sql-policy.mjs";
import {createAccountSelectionIntentPolicy} from "../domain/account-selection-intent.mjs";
const A="11111111-1111-4111-8111-111111111111";
const B="22222222-2222-4222-8222-222222222222";
const ACCOUNT="33333333-3333-4333-8333-333333333333";

test("server-verified identity and canonical SQL execute only read-only no-grant prototype",async()=>{
 const trace=[];
 const pool={async connect(){
  const commands=[];
  const client={
   async query(sql,params){
    commands.push({sql,params});trace.push({sql,params});
    return {rows:[]};
   },release(discard){trace.push({release:discard});}
  };
  return client;
 }};
 const identity=createTrustedAccountPrincipalResolver({verifyServerSession:async req=>(
  req.session==="A"?{authenticated:true,revoked:false,subjectId:A,expiresAt:Math.floor(Date.now()/1000)+600}:
  req.session==="B"?{authenticated:true,revoked:false,subjectId:B,expiresAt:Math.floor(Date.now()/1000)+600}:null
 )});
 const transaction=createAccountReadTransaction({pool,assertReadStatement:assertAccountReadStatement});
 const binding=createAccountReadBinding({principalResolver:identity,transaction});
 const [one,two]=await Promise.all([
  binding.query({session:"A"},"ACCOUNT_LIST"),
  binding.query({session:"B"},"PERSONAL_WALLET_IDS",ACCOUNT)
 ]);
 assert.deepEqual(one.rows,[]);assert.deepEqual(two.rows,[]);
 const accountCalls=trace.filter(x=>x.sql?.startsWith("SELECT a.id"));
 assert.equal(accountCalls.length,2);
 assert.deepEqual(accountCalls.map(x=>x.params),[[A],[ACCOUNT,B]]);
 assert.equal(trace.filter(x=>x.sql==="COMMIT").length,2);
 assert.equal(trace.filter(x=>x.release===false).length,2);
});
test("unauthenticated request, invalid query and preview switch never grant money movement",async()=>{
 let count=0;
 const identity=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>null});
 const transaction={execute:async()=>{count++;return {rows:[]};}};
 const binding=createAccountReadBinding({principalResolver:identity,transaction});
 await assert.rejects(()=>binding.query({},"ACCOUNT_LIST"),/ACCOUNT_AUTH_REQUIRED/);
 assert.equal(count,0);
 const policy=createAccountSelectionIntentPolicy();
 const pending=policy.consume(policy.issue({accountId:ACCOUNT}));
 assert.equal(pending.financialExecutionEnabled,false);
 assert.equal(pending.selectionAuthorised,false);
});
