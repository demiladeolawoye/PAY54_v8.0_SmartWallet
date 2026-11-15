"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountWalletReader} from "../domain/account-wallet-reader.mjs";
const P="11111111-1111-4111-8111-111111111111";
const A="22222222-2222-4222-8222-222222222222";
const OTHER="33333333-3333-4333-8333-333333333333";
const W="44444444-4444-4444-8444-444444444444";
const row={
 account_id:A,owner_id:P,account_type:"PERSONAL",display_name:"Personal",
 account_status:"ACTIVE",verification_status:"VERIFIED",
 principal_subject:P,role:"PERSONAL_OWNER",membership_status:"ACTIVE",
 wallet_id:W,wallet_owner:P,wallet_status:"ACTIVE",
 binding_account_id:A,binding_wallet_id:W
};
test("wallet ID query is account-scoped and parameterised",async()=>{
 const calls=[];
 const reader=createAccountWalletReader({resolveAuthenticatedPrincipal:async()=>P,
 query:async(sql,values)=>{calls.push({sql,values});return {rows:[row]};}});
 assert.deepEqual(await reader.eligibleWalletIds({},A),[W]);
 assert.deepEqual(calls[0].values,[A,P]);
 assert.match(calls[0].sql,/m\.principal_subject=\$2::uuid/);
 assert.ok(Object.isFrozen(await reader.eligibleWalletIds({},A)));
});
test("forged query rows cannot return cross-account or mismatched owner wallet",async()=>{
 for(const forged of [
  {...row,account_id:OTHER},
  {...row,owner_id:OTHER},
  {...row,principal_subject:OTHER},
  {...row,binding_account_id:OTHER},
  {...row,wallet_status:"SUSPENDED"},
  {...row,membership_status:"REVOKED"},
  {...row,account_status:"SUSPENDED"}
 ]){
  const reader=createAccountWalletReader({resolveAuthenticatedPrincipal:async()=>P,query:async()=>({rows:[forged]})});
  assert.deepEqual(await reader.eligibleWalletIds({},A),[]);
 }
});
test("unauthenticated or malformed account IDs never reach database",async()=>{
 let count=0;
 const reader=createAccountWalletReader({resolveAuthenticatedPrincipal:async()=>null,query:async()=>{count++;return {rows:[]};}});
 await assert.rejects(()=>reader.eligibleWalletIds({},A),/ACCOUNT_AUTH_REQUIRED/);
 await assert.rejects(()=>reader.eligibleWalletIds({},"bad"),/INVALID_ACCOUNT_ID/);
 assert.equal(count,0);
});
test("duplicate wallet rows and oversized adapter responses fail closed",async()=>{
 const reader=createAccountWalletReader({resolveAuthenticatedPrincipal:async()=>P,query:async()=>({rows:[row,row]})});
 await assert.rejects(()=>reader.eligibleWalletIds({},A),/DUPLICATE_WALLET_BINDING/);
 const tooMany=createAccountWalletReader({resolveAuthenticatedPrincipal:async()=>P,
 query:async()=>({rows:Array.from({length:101},()=>row)})});
 await assert.rejects(()=>tooMany.eligibleWalletIds({},A),/STORE_UNAVAILABLE/);
});
