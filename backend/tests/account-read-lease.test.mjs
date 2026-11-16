"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {createAccountReadLease} from "../security/account-read-lease.mjs";
const P="11111111-1111-4111-8111-111111111111",ROLE="pay54_tenant_verified_0001";
async function actor(){
 const r=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
  subjectId:P,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60})});
 return createAccountDbPrincipal({principal:await r.resolve({}),roleName:ROLE,
  assertRoleMapping:()=>true});
}
test("one-use lease requires trusted principal and cannot enable financial rights",async()=>{
 let clock=1000;const policy=createAccountReadLease({now:()=>clock,ttlMs:1000});
 const t=policy.issue(await actor()),r=policy.consume(t);
 assert.equal(r.transactionAuthorized,false);
 assert.equal(r.financialExecutionEnabled,false);
 assert.throws(()=>policy.consume(t),/ACCOUNT_LEASE_EXPIRED/);
});
test("expired, copied, revoked or rolled-back leases deny",async()=>{
 let clock=1000;const policy=createAccountReadLease({now:()=>clock,ttlMs:1000});
 const dbPrincipal=await actor();
 const original=policy.issue(dbPrincipal);
 assert.throws(()=>policy.consume({...original}),/ACCOUNT_LEASE_EXPIRED/);
 clock=2001;assert.throws(()=>policy.consume(original),/ACCOUNT_LEASE_EXPIRED/);
 const removed=policy.issue(dbPrincipal);policy.revoke(removed);
 assert.throws(()=>policy.consume(removed),/ACCOUNT_LEASE_EXPIRED/);
});
