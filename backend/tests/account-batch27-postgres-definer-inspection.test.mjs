"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {inspectPay54SessionFunctionOwners as inspect,
 PAY54_DEFINER_OWNER_SQL as sql}
 from "../src/pay54-batch27-postgres-definer-inspection.mjs";
const rows=[
 ["consume_identity_assertion_and_issue_bootstrap","pay54_session_issue_executor_role"],
 ["bind_initial_account_session","pay54_session_rotate_executor_role"],
 ["rotate_account_context_session","pay54_session_rotate_executor_role"]
].map(([function_name,owner_role])=>({function_name,owner_role,
 security_definer:true,owner_can_login:false,owner_bypass_rls:false,
 owner_superuser:false}));
const pool=data=>({async connect(){return{
 async query(statement){return statement===sql?{rows:data}:{rows:[]};},
 release(){}
}}});
test("1137: restricted function owners checked from read-only PostgreSQL catalogue",async()=>{
 const r=await inspect({readPool:pool(rows)});
 assert.equal(r.restrictedFunctionCount,3);
 assert.equal(r.deploymentAuthorised,false);
});
test("1137: login, BYPASSRLS, owner reassignment and missing function denied",async()=>{
 for(const data of [rows.slice(0,2),
  rows.map((x,i)=>i===0?{...x,owner_can_login:true}:x),
  rows.map((x,i)=>i===1?{...x,owner_role:"postgres"}:x),
  rows.map((x,i)=>i===2?{...x,owner_bypass_rls:true}:x)])
  await assert.rejects(inspect({readPool:pool(data)}),
  /SECURITY_DEFINER_CATALOGUE_DENIED/);
});
