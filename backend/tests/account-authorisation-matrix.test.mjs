"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {evaluateAccountAuthorisationMatrix} from "../governance/account-authorisation-matrix.mjs";
const P="11111111-1111-4111-8111-111111111111";
const A="22222222-2222-4222-8222-222222222222";
const B="33333333-3333-4333-8333-333333333333";
const business={accountId:A,type:"BUSINESS",displayName:"Example Ltd",legalOwnerId:P,status:"ACTIVE",verificationStatus:"VERIFIED"};
const membership=role=>({accountId:A,principalId:P,role,status:"ACTIVE"});
const check=(role,changes={})=>evaluateAccountAuthorisationMatrix({
 principalId:P,account:business,membership:membership(role),...changes
});
test("role capabilities preserve legitimate view differences without money authorisation",()=>{
 const viewer=check("BUSINESS_VIEWER"),owner=check("BUSINESS_OWNER");
 assert.deepEqual(viewer.operations,{view:true,manage:false,initiate:false,approve:false});
 assert.equal(owner.operations.approve,true);
 assert.equal(owner.canPostMoney,false);
 assert.equal(owner.canApproveFinancialOperation,false);
});
test("revocation, business account substitution, cross-subject and KYB denial return no view",()=>{
 for(const changes of [
  {account:{...business,accountId:B}},
  {principalId:B},
  {membership:{...membership("BUSINESS_OWNER"),status:"REVOKED"}},
  {account:{...business,status:"SUSPENDED"}},
  {account:{...business,status:"PENDING_VERIFICATION",verificationStatus:"IN_REVIEW"}}
 ]){
  const result=check("BUSINESS_OWNER",changes);
  assert.equal(result.canDisplayAccount,false);
  assert.equal(result.canPostMoney,false);
 }
});
