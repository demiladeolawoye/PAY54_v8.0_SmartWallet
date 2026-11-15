"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountIdentityEnvelope} from "../security/account-identity-envelope.mjs";
import {assertAccountRequestScope} from "../http/account-request-scope.mjs";
import {createAccountTenantQueryGuard} from "../db/account-tenant-query-guard.mjs";
import {createIdentityScopedAccountTransaction} from "../db/account-identity-transaction.mjs";
import {createAccountAuditEnvelope} from "../security/account-audit-envelope.mjs";

const P="11111111-1111-4111-8111-111111111111";
const Q="22222222-2222-4222-8222-222222222222";
const A="33333333-3333-4333-8333-333333333333";
const B="44444444-4444-4444-8444-444444444444";
const account={accountId:A,legalOwnerId:P,type:"BUSINESS",displayName:"Business",
 status:"ACTIVE",verificationStatus:"VERIFIED"};
const membership={accountId:A,principalId:P,role:"BUSINESS_VIEWER",status:"ACTIVE"};
const resolver=createTrustedAccountPrincipalResolver({
 verifyServerSession:async request=>request.authenticated ? {
   subjectId:request.subject,authenticated:true,revoked:false,
   expiresAt:Math.floor(Date.now()/1000)+120
 } : null
});
test("trusted principal, selected tenant and canonical SQL are independent checks",async()=>{
 const principal=await resolver.resolve({authenticated:true,subject:P});
 const identity=createAccountIdentityEnvelope({principal,requestedAccountId:A});
 const scope=assertAccountRequestScope({identity,account,membership});
 assert.equal(scope.accountId,A);
 assert.equal(scope.transactionAuthorised,false);
 const prepared=createAccountTenantQueryGuard().prepare({principal,queryId:"ACCOUNT_SELECT",accountId:A});
 assert.deepEqual(prepared.params,[P,A]);
 assert.equal(prepared.financialExecutionEnabled,false);
 const observed=[];
 const read=createIdentityScopedAccountTransaction({
   transaction:{execute:async value=>{observed.push(value);return {rows:[]};}}
 });
 const result=await read.execute({principal,queryId:"ACCOUNT_SELECT",accountId:A});
 assert.equal(result.financialExecutionEnabled,false);
 assert.deepEqual(observed[0].params,[P,A]);
});
test("cross-tenant scope, fake identity and failed sessions deny without read operation",async()=>{
 let invoked=0;
 const read=createIdentityScopedAccountTransaction({
   transaction:{execute:async()=>{invoked++;return {rows:[]};}}
 });
 const principal=await resolver.resolve({authenticated:true,subject:Q});
 const identity=createAccountIdentityEnvelope({principal,requestedAccountId:A});
 assert.throws(()=>assertAccountRequestScope({identity,account,membership}),/ACCOUNT_NOT_AVAILABLE/);
 await assert.rejects(()=>read.execute({principal:{subjectId:Q},queryId:"ACCOUNT_SELECT",accountId:A}),/ACCOUNT_AUTH_REQUIRED/);
 await assert.rejects(()=>resolver.resolve({authenticated:false,subject:Q}),/ACCOUNT_AUTH_REQUIRED/);
 assert.equal(invoked,0);
});
test("audit records only opaque event IDs, not account or user identities",async()=>{
 const entries=[];
 const audit=createAccountAuditEnvelope({sink:async item=>entries.push(item)});
 const event=await audit.publish({operation:"ACCOUNT_SELECT",outcome:"DENIED",reason:"NO_MEMBERSHIP",
   subjectId:P,accountId:B,sessionToken:"not-for-audit"});
 assert.equal(event.financialExecutionEnabled,false);
 assert.equal(JSON.stringify(event).includes(P),false);
 assert.equal(JSON.stringify(event).includes(B),false);
 assert.equal(JSON.stringify(event).includes("not-for-audit"),false);
 assert.equal(entries.length,1);
});
