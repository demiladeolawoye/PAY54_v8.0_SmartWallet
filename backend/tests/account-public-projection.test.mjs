"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { projectAccountForSwitcher, projectAccountList } from "../domain/account-public-projection.mjs";
const ID="22222222-2222-4222-8222-222222222222";
const OWNER="11111111-1111-4111-8111-111111111111";
const good={
  accountId:ID,legalOwnerId:OWNER,type:"PERSONAL",displayName:"Personal",
  status:"ACTIVE",verificationStatus:"VERIFIED"
};
test("picker exposes only a deliberately minimal projection",()=>{
  const p=projectAccountForSwitcher(good);
  assert.deepEqual(p,{accountId:ID,type:"PERSONAL",displayName:"Personal"});
  assert.equal(JSON.stringify(p).includes(OWNER),false);
  assert.ok(Object.isFrozen(p));
});
test("picker cannot expose unverified or suspended account",()=>{
  assert.throws(()=>projectAccountForSwitcher({...good,status:"SUSPENDED"}),/ACCOUNT_NOT_AVAILABLE/);
  assert.throws(()=>projectAccountForSwitcher({...good,verificationStatus:"NOT_VERIFIED",status:"PENDING_VERIFICATION"}),/ACCOUNT_NOT_AVAILABLE/);
});
test("duplicate and oversized account responses fail closed",()=>{
  assert.throws(()=>projectAccountList([good,good]),/DUPLICATE/);
  assert.throws(()=>projectAccountList(Array.from({length:101},()=>good)),TypeError);
  assert.ok(Object.isFrozen(projectAccountList([good])));
});
