"use strict";import test from "node:test";import assert from "node:assert/strict";
import {createTrustedAccountPrincipalResolver} from "../domain/trusted-account-principal.mjs";
import {createAccountIdentityEnvelope} from "../security/account-identity-envelope.mjs";
import {assertAccountRequestScope} from "../http/account-request-scope.mjs";
const P="11111111-1111-4111-8111-111111111111",A="22222222-2222-4222-8222-222222222222",B="33333333-3333-4333-8333-333333333333";
const account={accountId:A,legalOwnerId:P,type:"BUSINESS",displayName:"Ltd",status:"ACTIVE",verificationStatus:"VERIFIED"};
const membership={accountId:A,principalId:P,role:"BUSINESS_VIEWER",status:"ACTIVE"};
test("trusted identity and active membership are required together",async()=>{
 const resolver=createTrustedAccountPrincipalResolver({verifyServerSession:async()=>({
 subjectId:P,authenticated:true,revoked:false,expiresAt:Math.floor(Date.now()/1000)+60})});
 const principal=await resolver.resolve({});
 const identity=createAccountIdentityEnvelope({principal,requestedAccountId:A});
 const result=assertAccountRequestScope({identity,account,membership});
 assert.equal(result.financialExecutionEnabled,false);
 assert.equal(result.transactionAuthorised,false);
 assert.throws(()=>assertAccountRequestScope({identity:{...identity},account,membership}),/ACCOUNT_IDENTITY_DENIED/);
 assert.throws(()=>assertAccountRequestScope({identity,account:{...account,accountId:B},membership}),/ACCOUNT_NOT_AVAILABLE/);
 assert.throws(()=>assertAccountRequestScope({identity,account,membership:{...membership,status:"REVOKED"}}),/ACCOUNT_NOT_AVAILABLE/);
});
