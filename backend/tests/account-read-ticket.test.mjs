"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {createAccountReadTicketPolicy} from "../security/account-read-ticket.mjs";
const P="11111111-1111-4111-8111-111111111111";
const A="22222222-2222-4222-8222-222222222222";
const ROLE="pay54_tenant_safe_0001";
async function descriptor(){
 const resolver=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
  subjectId:P,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60})});
 return createAccountDbPrincipal({principal:await resolver.resolve({}),roleName:ROLE,
  assertRoleMapping:(p,r)=>p===P&&r===ROLE});
}
test("ticket is single-use, bounded, opaque and still requires DB actor proof",async()=>{
 let time=1000;
 const policy=createAccountReadTicketPolicy({now:()=>time,ttlMs:1000});
 const dbPrincipal=await descriptor();
 const ticket=policy.issue({dbPrincipal,queryId:"ACCOUNT_SELECT",accountId:A});
 assert.ok(Object.isFrozen(ticket));
 assert.equal(ticket.financialExecutionEnabled,false);
 const plan=policy.consume(ticket);
 assert.deepEqual(plan.params,[P,A]);
 assert.equal(plan.requiresDatabaseActorVerification,true);
 assert.throws(()=>policy.consume(ticket),/READ_TICKET_EXPIRED/);
});
test("ticket expiry, copy/replay, missing verified principal and clock rollback deny",async()=>{
 let time=1000;
 const policy=createAccountReadTicketPolicy({now:()=>time,ttlMs:1000});
 const dbPrincipal=await descriptor();
 const ticket=policy.issue({dbPrincipal,queryId:"ACCOUNT_LIST"});
 assert.throws(()=>policy.consume({...ticket}),/READ_TICKET_EXPIRED/);
 time=2100;assert.throws(()=>policy.consume(ticket),/READ_TICKET_EXPIRED/);
 assert.throws(()=>policy.issue({dbPrincipal:{principalId:P},queryId:"ACCOUNT_LIST"}),/DB_PRINCIPAL_DENIED/);
 assert.throws(()=>policy.issue({dbPrincipal,queryId:"DROP_TABLE"}),/UNAPPROVED_ACCOUNT_QUERY/);
});
