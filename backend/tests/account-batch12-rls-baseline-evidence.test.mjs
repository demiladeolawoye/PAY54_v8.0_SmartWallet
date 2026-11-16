"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {
 PAY54_ACCOUNT_RLS_BASELINE_SQL,PAY54_ACCOUNT_ROLE_BASELINE_SQL,
 assessPay54AccountRlsBaseline
} from "../db/account-rls-baseline-evidence.mjs";

const role=Object.freeze({
 role_name:"pay54_account_reader_role",can_login:false,
 superuser:false,bypass_rls:false,can_inherit:false,
 can_create_role:false,memberships_count:0
});
const relations=[
 "account_contexts","account_memberships","personal_wallet_bindings"
].map(relation_name=>({
 relation_name,rls_enabled:true,rls_forced:true,
 reader_select:false,reader_insert:false,reader_update:false,
 reader_delete:false,restrictive_reader_deny:true
}));
const inspect=(patch={})=>assessPay54AccountRlsBaseline({
 relations:patch.relations??relations,role:patch.role??role
});
test("356: restricted baseline is a source review, not operational authorization",()=>{
 const result=inspect();
 assert.equal(result.sourceBaselinePassed,true);
 assert.equal(result.findings.length,0);
 assert.equal(result.customerReadAccessApproved,false);
 assert.equal(result.catalogResultProvenanceVerified,false);
 assert.equal(result.liveDatabaseIdentityIndependentlyVerified,false);
 assert.equal(result.rlsActivationApproved,false);
 assert.equal(result.release,"BLOCKED");
 assert.ok(Object.isFrozen(result.findings));
});
test("356: PostgreSQL queries inspect catalogs only and make no privilege changes",()=>{
 for(const sql of [PAY54_ACCOUNT_RLS_BASELINE_SQL,PAY54_ACCOUNT_ROLE_BASELINE_SQL]){
  assert.match(sql,/^SELECT /);
  assert.match(sql,/FROM pg_(?:class|roles)/);
  assert.doesNotMatch(sql,/\b(?:GRANT|REVOKE|ALTER|CREATE|DROP|INSERT|UPDATE|DELETE|SET ROLE)\s+/i);
 }
 assert.match(PAY54_ACCOUNT_RLS_BASELINE_SQL,/pg_policy/);
 assert.match(PAY54_ACCOUNT_RLS_BASELINE_SQL,/pg_get_expr/);
});
test("356: any table grant, missing forced RLS or deny policy blocks",()=>{
 for(const patch of [
  {reader_select:true},
  {reader_insert:true},
  {reader_update:true},
  {reader_delete:true},
  {rls_enabled:false},
  {rls_forced:false},
  {restrictive_reader_deny:false}
 ]){
  const result=inspect({relations:relations.map((r,i)=>
   i===0?{...r,...patch}:r
  )});
  assert.equal(result.sourceBaselinePassed,false);
  assert.equal(result.customerDataAccessApproved,false);
 }
});
test("356: role escalation, login, inheritance and membership always block",()=>{
 for(const patch of [
  {can_login:true},{superuser:true},{bypass_rls:true},
  {can_inherit:true},{can_create_role:true},{memberships_count:1}
 ]){
  const report=inspect({role:{...role,...patch}});
  assert.equal(report.sourceBaselinePassed,false);
  assert.ok(report.findings.includes("READER_ROLE_ESCALATED"));
 }
});
test("356: forged missing or duplicate catalog rows cannot prove baseline",()=>{
 for(const list of [
  [],relations.slice(0,2),
  [relations[0],relations[0],relations[2]],
  [{...relations[0],reader_select:"false"},relations[1],relations[2]],
  [{...relations[0],relation_name:"wallets"},relations[1],relations[2]]
 ]){
  assert.throws(()=>inspect({relations:list}),/PAY54_RLS_BASELINE_EVIDENCE_INVALID/);
 }
 assert.throws(()=>inspect({role:{...role,memberships_count:"0"}}),
  /PAY54_RLS_BASELINE_EVIDENCE_INVALID/);
});
