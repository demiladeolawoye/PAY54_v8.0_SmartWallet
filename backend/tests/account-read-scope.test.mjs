"use strict";import test from "node:test";import assert from "node:assert/strict";
import {filterAccountReadScope} from "../domain/account-read-scope.mjs";
const P="11111111-1111-4111-8111-111111111111",Q="22222222-2222-4222-8222-222222222222",A="33333333-3333-4333-8333-333333333333";
const account={accountId:A,type:"BUSINESS",legalOwnerId:P,status:"ACTIVE",verificationStatus:"VERIFIED",displayName:"Ltd"};
const membership={principalId:P,accountId:A,role:"BUSINESS_VIEWER",status:"ACTIVE"};
test("business list includes only verified active membership",()=>{
 assert.deepEqual(filterAccountReadScope({principalId:P,items:[{account,membership}]}),
 [{accountId:A,type:"BUSINESS",displayName:"Ltd"}]);
});
test("cross-principal or revoked business access is not returned",()=>{
 assert.deepEqual(filterAccountReadScope({principalId:Q,items:[{account,membership}]}),[]);
 assert.deepEqual(filterAccountReadScope({principalId:P,items:[{account,membership:{...membership,status:"REVOKED"}}]}),[]);
 assert.throws(()=>filterAccountReadScope({principalId:P,items:[{account,membership},{account,membership}]}),/DUPLICATE_ACCOUNT_SCOPE/);
});
