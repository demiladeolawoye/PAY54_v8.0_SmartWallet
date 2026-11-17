"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54StagingRoleGrantDrift as inspect}
 from "../governance/pay54-batch27-role-grant-drift.mjs";
const rows=["pay54_session_read_role","pay54_account_directory_read_role",
 "pay54_session_rotate_role","pay54_session_issue_role"].map(role_name=>({
 role_name,rolcanlogin:false,rolsuper:false,rolbypassrls:false,
 rolinherit:false,rolcreaterole:false,rolcreatedb:false,
 has_ledger_write:false,has_audit_write:false}));
test("1082: four restricted non-login runtime roles still need trusted catalog source",()=>{
 const r=inspect({rows});
 assert.equal(r.restrictedRoleCount,4);
 assert.equal(r.actualStagingConnectionEstablishedByThisModule,false);
});
test("1082: role reuse, login and financial privilege escalation rejected",()=>{
 for(const change of [
  rows.map((x,i)=>i===3?rows[0]:x),
  rows.map((x,i)=>i===1?{...x,rolcanlogin:true}:x),
  rows.map((x,i)=>i===2?{...x,has_ledger_write:true}:x),
  rows.slice(0,3)
 ])assert.throws(()=>inspect({rows:change}),/STAGING_ROLE_GRANT_DRIFT_DENIED/);
});
