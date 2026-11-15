"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { assessAccountOperation } from "../domain/account-operation-policy.mjs";
const P="11111111-1111-4111-8111-111111111111";
const OTHER="66666666-6666-4666-8666-666666666666";
const ACCOUNT="33333333-3333-4333-8333-333333333333";
const account={accountId:ACCOUNT,legalOwnerId:P,type:"BUSINESS",displayName:"Example Ltd",status:"ACTIVE",verificationStatus:"VERIFIED"};
const membership={accountId:ACCOUNT,principalId:P,role:"BUSINESS_OWNER",status:"ACTIVE"};
const ask=(operation,rest={})=>assessAccountOperation({principalId:P,account,membership,operation,...rest});
test("view policy eligibility never enables actual financial execution",()=>{
  assert.deepEqual(ask("view"),{permitted:true,reason:"POLICY_ELIGIBLE_ONLY",executionEnabled:false});
  assert.equal(ask("initiate").executionEnabled,false);
});
test("a maker cannot approve their own financial operation",()=>{
  assert.equal(ask("approve",{initiatorId:P}).reason,"MAKER_CHECKER_CONFLICT");
  assert.equal(ask("approve").reason,"MAKER_ID_REQUIRED");
  assert.equal(ask("approve",{initiatorId:OTHER}).permitted,true);
  assert.equal(ask("approve",{initiatorId:OTHER}).executionEnabled,false);
});
test("membership, account and operation failures deny",()=>{
  assert.equal(ask("delete").permitted,false);
  assert.equal(ask("view",{membership:{...membership,status:"REVOKED"}}).permitted,false);
  assert.equal(ask("approve",{membership:{...membership,role:"BUSINESS_VIEWER"},initiatorId:OTHER}).permitted,false);
  assert.equal(ask("view",{account:{...account,status:"SUSPENDED"}}).permitted,false);
});
