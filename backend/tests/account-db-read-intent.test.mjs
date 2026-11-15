"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {createDbReadIntentGate} from "../security/account-db-read-intent.mjs";
const P="11111111-1111-4111-8111-111111111111";
const N="22222222-2222-4222-8222-222222222222";
const ROLE="pay54_tenant_safe_0001";
async function principal(){
 const r=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
  subjectId:P,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60
 })});
 return createAccountDbPrincipal({principal:await r.resolve({}),roleName:ROLE,assertRoleMapping:()=>true});
}
test("trusted actor and one-use nonce remain read-only",async()=>{
 const seen=new Set(),dbPrincipal=await principal();
 const gate=createDbReadIntentGate({atomicClaim:async({nonce})=>{
  if(seen.has(nonce))return false;seen.add(nonce);return true;
 }});
 const allowed=await gate.authorise({dbPrincipal,queryId:"ACCOUNT_LIST",nonce:N});
 assert.equal(allowed.readOnly,true);
 assert.equal(allowed.financialExecutionEnabled,false);
 await assert.rejects(()=>gate.authorise({dbPrincipal,queryId:"ACCOUNT_LIST",nonce:N}),/DB_INTENT_DENIED/);
});
test("forged actor, invalid query, unavailable atomic store deny",async()=>{
 const dbPrincipal=await principal();
 const gate=createDbReadIntentGate({atomicClaim:async()=>{throw Error("offline")}});
 await assert.rejects(()=>gate.authorise({dbPrincipal,queryId:"ACCOUNT_SELECT",nonce:N}),
  /DB_INTENT_BACKEND_UNAVAILABLE/);
 await assert.rejects(()=>gate.authorise({dbPrincipal:{...dbPrincipal},queryId:"ACCOUNT_LIST",nonce:N}),
  /DB_PRINCIPAL_DENIED/);
 await assert.rejects(()=>gate.authorise({dbPrincipal,queryId:"PAY",nonce:N}),/DB_INTENT_DENIED/);
});
