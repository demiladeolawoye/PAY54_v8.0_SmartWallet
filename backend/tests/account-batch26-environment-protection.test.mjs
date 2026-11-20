"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54ProtectedEnvironment as inspect}
 from "../governance/pay54-batch26-environment-protection.mjs";
const x={environmentName:"pay54-staging",requiresReview:true,
 allowAdminBypass:false,allowedBranch:"project-titan",
 oidcAudience:"https://github.com/demiladeolawoye",reviewerCount:2};
test("1032: two-reviewer environment metadata never supplies actual IAM approval",()=>{
 const r=inspect(x);
 assert.equal(r.sourcePolicyLooksRestricted,true);
 assert.equal(r.environmentSettingsAuthenticated,false);
 assert.equal(r.productionDeploymentAuthorised,false);
});
test("1032: bypass, insufficient reviewers and incorrect audience block policy",()=>{
 assert.equal(inspect({...x,allowAdminBypass:true}).sourcePolicyLooksRestricted,false);
 assert.equal(inspect({...x,reviewerCount:1}).sourcePolicyLooksRestricted,false);
 assert.throws(()=>inspect({...x,oidcAudience:"https://evil.example"}),
 /PROTECTED_ENVIRONMENT_DENIED/);
});
