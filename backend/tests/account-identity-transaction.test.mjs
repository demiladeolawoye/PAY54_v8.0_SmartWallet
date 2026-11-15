"use strict";
import test from "node:test";import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createIdentityScopedAccountTransaction} from "../db/account-identity-transaction.mjs";
const P="11111111-1111-4111-8111-111111111111";
const A="22222222-2222-4222-8222-222222222222";
const resolver=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
 subjectId:P,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60
})});
test("bound account transaction uses only verified server principal",async()=>{
 const calls=[];
 const adapter=createIdentityScopedAccountTransaction({transaction:{execute:async v=>{
 calls.push(v);return {rows:[{account_id:A}]};}}});
 const principal=await resolver.resolve({});
 const output=await adapter.execute({principal,queryId:"ACCOUNT_SELECT",accountId:A});
 assert.deepEqual(calls[0].params,[P,A]);
 assert.equal(output.financialExecutionEnabled,false);
 assert.ok(Object.isFrozen(output.rows[0]));
});
test("forged principal and unknown query never reach transaction",async()=>{
 let n=0;const adapter=createIdentityScopedAccountTransaction({transaction:{execute:async()=>{n++;return {rows:[]};}}});
 await assert.rejects(()=>adapter.execute({principal:{subjectId:P},queryId:"ACCOUNT_LIST"}),/ACCOUNT_AUTH_REQUIRED/);
 const principal=await resolver.resolve({});
 await assert.rejects(()=>adapter.execute({principal,queryId:"DELETE_LEDGER"}),/UNAPPROVED_ACCOUNT_QUERY/);
 assert.equal(n,0);
});
