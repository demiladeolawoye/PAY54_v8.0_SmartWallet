"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assertTenantAccountAccess} from "../domain/account-tenant-boundary.mjs";
const P="11111111-1111-4111-8111-111111111111";
const Q="22222222-2222-4222-8222-222222222222";
const B="33333333-3333-4333-8333-333333333333";
const account={accountId:B,legalOwnerId:P,type:"BUSINESS",displayName:"Business",status:"ACTIVE",verificationStatus:"VERIFIED"};
const membership={principalId:P,accountId:B,role:"BUSINESS_VIEWER",status:"ACTIVE"};
const request=change=>({principalId:P,account,membership,requestedAccountId:B,...change});
test("business viewer can see only explicitly delegated account",()=>{
 const result=assertTenantAccountAccess(request());
 assert.equal(result.accountId,B);
 assert.equal(result.financialExecutionEnabled,false);
});
test("cross-tenant request, revoked membership and suspended account deny",()=>{
 for(const change of [
  {principalId:Q},{requestedAccountId:Q},
  {membership:{...membership,status:"REVOKED"}},
  {account:{...account,status:"SUSPENDED"}},
  {membership:{...membership,accountId:Q}},
  {account:{...account,verificationStatus:"REJECTED",status:"PENDING_VERIFICATION"}}
 ])assert.throws(()=>assertTenantAccountAccess(request(change)),/ACCOUNT_NOT_AVAILABLE/);
});
