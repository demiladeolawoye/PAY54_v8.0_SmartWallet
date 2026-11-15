"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountDbPrincipal} from "../security/account-db-principal.mjs";
import {createAccountReadTicketPolicy} from "../security/account-read-ticket.mjs";
import {createAccountTenantReadService} from "../db/account-tenant-read-service.mjs";
const P="11111111-1111-4111-8111-111111111111",Q="22222222-2222-4222-8222-222222222222";
const A="33333333-3333-4333-8333-333333333333",B="44444444-4444-4444-8444-444444444444";
const ROLE="pay54_tenant_safe_0001";
const row={account_id:A,legal_owner_id:P,type:"BUSINESS",display_name:"Business",
 status:"ACTIVE",verification_status:"VERIFIED",principal_id:P,
 role:"BUSINESS_VIEWER",membership_status:"ACTIVE"};
async function context(rows=[row]){
 const r=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
  subjectId:P,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60})});
 const dbPrincipal=createAccountDbPrincipal({principal:await r.resolve({}),roleName:ROLE,
  assertRoleMapping:()=>true});
 const ticketPolicy=createAccountReadTicketPolicy();
 const ticket=ticketPolicy.issue({dbPrincipal,queryId:"ACCOUNT_SELECT",accountId:A});
 let calls=0;
 const service=createAccountTenantReadService({ticketPolicy,actorTransaction:{execute:async()=>{
  calls++;return {rows};
 }}});
 return {ticket,service,get calls(){return calls;}};
}
test("account read returns only authorised display metadata after actor contract",async()=>{
 const ctx=await context();
 const result=await ctx.service.read(ctx.ticket);
 assert.deepEqual(result.accounts,[{accountId:A,type:"BUSINESS",displayName:"Business",financialExecutionEnabled:false}]);
 assert.equal(result.financialExecutionEnabled,false);
 assert.equal(ctx.calls,1);
 await assert.rejects(()=>ctx.service.read(ctx.ticket),/READ_TICKET_EXPIRED/);
});
test("cross-tenant, revoked, wrong selected account, duplicate and missing rows deny",async()=>{
 for(const rows of [
  [{...row,principal_id:Q}], [{...row,membership_status:"REVOKED"}],
  [{...row,account_id:B}], [row,row], [],
  [{...row,type:"PERSONAL",role:"BUSINESS_VIEWER"}]
 ]){
  const ctx=await context(rows);
  await assert.rejects(()=>ctx.service.read(ctx.ticket),/ACCOUNT_TENANT_READ_DENIED|ACCOUNT_READ_UNAVAILABLE|ACCOUNT_DUPLICATE_DISCLOSURE/);
 }
});
test("wallet-query ticket cannot be used for account label read",async()=>{
 const r=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
  subjectId:P,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60})});
 const dbPrincipal=createAccountDbPrincipal({principal:await r.resolve({}),roleName:ROLE,assertRoleMapping:()=>true});
 const ticketPolicy=createAccountReadTicketPolicy();
 const ticket=ticketPolicy.issue({dbPrincipal,queryId:"PERSONAL_WALLET_IDS",accountId:A});
 const service=createAccountTenantReadService({ticketPolicy,actorTransaction:{execute:async()=>{throw Error("MUST_NOT_CALL");}}});
 await assert.rejects(()=>service.read(ticket),/ACCOUNT_READ_SCOPE_DENIED/);
});
