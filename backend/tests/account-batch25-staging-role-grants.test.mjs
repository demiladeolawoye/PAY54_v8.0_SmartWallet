"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {validatePay54StagingRoleGrantPlan as validate}
 from "../governance/pay54-batch25-staging-role-grants.mjs";
const roles=[
 "pay54_session_read_role",
 "pay54_account_directory_read_role",
 "pay54_session_rotate_role",
 "pay54_session_issue_role"
];
const assign=roles.map((role,i)=>({
 role,login:"pay54_staging_reader_"+i,
 allowInheritedRoles:false,allowSuperuser:false,
 allowBypassRls:false,allowFinancialDml:false
}));
test("1008: four separate restricted roles are only source grant intent",()=>{
 const r=validate({assignments:assign});
 assert.equal(r.expectedDistinctLogins,4);
 assert.equal(r.actualPgAuthMembersInspected,false);
 assert.equal(r.roleGrantsExecuted,false);
 assert.equal(r.productionDeploymentAuthorised,false);
 assert.ok(Object.isFrozen(r.approvedRoleNames));
});
test("1008: function-owner login and reused shared user are forbidden",()=>{
 for(const altered of [
  {...assign[2],role:"pay54_session_rotate_executor_role"},
  {...assign[2],login:"pay54_session_issue_executor_role"},
  {...assign[2],login:assign[0].login},
  {...assign[2],allowBypassRls:true},
  {...assign[2],allowFinancialDml:true},
  {...assign[2],allowSuperuser:true}
 ]){
  const values=assign.map((v,i)=>i===2?altered:v);
  assert.throws(()=>validate({assignments:values}),
   /STAGING_ROLE_GRANT_PLAN_DENIED/);
 }
 assert.throws(()=>validate({assignments:assign.slice(0,3)}),
  /STAGING_ROLE_GRANT_PLAN_DENIED/);
});
