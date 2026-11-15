"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {evaluateAccountCapabilities} from "../domain/account-capability-grants.mjs";
const P="11111111-1111-4111-8111-111111111111",A="22222222-2222-4222-8222-222222222222";
const account={accountId:A,legalOwnerId:P,type:"BUSINESS",displayName:"Ltd",status:"ACTIVE",verificationStatus:"VERIFIED"};
const m=role=>({principalId:P,accountId:A,role,status:"ACTIVE"});
const evaluate=membership=>evaluateAccountCapabilities({principalId:P,account,membership});
test("business viewer cannot initiate or approve financial actions",()=>{
 const result=evaluate(m("BUSINESS_VIEWER"));
 assert.deepEqual(result.operations,["view"]);
 assert.equal(result.mayApprove,false);assert.equal(result.financialExecutionEnabled,false);
});
test("business owner approval capability is not an executable payment approval",()=>{
 const result=evaluate(m("BUSINESS_OWNER"));
 assert.equal(result.mayApprove,true);
 assert.equal(result.financialExecutionEnabled,false);
 assert.ok(Object.isFrozen(result.operations));
});
test("revoked principal and tenant mismatches have no capability",()=>{
 for(const membership of [{...m("BUSINESS_OWNER"),status:"REVOKED"},
  {...m("BUSINESS_OWNER"),principalId:A}]){
  assert.equal(evaluate(membership).operations.length,0);
 }
});
