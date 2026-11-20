"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54BranchProtection as inspect}
 from "../governance/pay54-batch27-branch-policy.mjs";
const base={repositoryFullName:"demiladeolawoye/PAY54_v8.0_SmartWallet",
 branchName:"project-titan",apiStatus:200,
 protection:{required_pull_request_reviews:{
  required_approving_review_count:2,dismiss_stale_reviews:true},
  required_status_checks:{strict:true},enforce_admins:{enabled:true},
  restrictions:{users:[],teams:[],apps:[]}}};
test("1080: apparent 2-review protection still lacks independently authenticated proof",()=>{
 const r=inspect(base);
 assert.equal(r.sourcePolicyAppearsStrict,true);
 assert.equal(r.currentEffectiveBranchControlVerified,false);
});
test("1080: missing API, 403, disabled admin review and loose CI deny or flag",()=>{
 assert.throws(()=>inspect({...base,apiStatus:403}),
 /BRANCH_PROTECTION_OBSERVATION_DENIED/);
 assert.equal(inspect({...base,protection:{...base.protection,
  enforce_admins:{enabled:false}}}).sourcePolicyAppearsStrict,false);
 assert.equal(inspect({...base,protection:{...base.protection,
  required_status_checks:{strict:false}}}).sourcePolicyAppearsStrict,false);
});
