"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createPay54StagingRlsInspector as make,
 PAY54_POSTGRES_RLS_OBSERVER_SQL as sql}
 from "../src/pay54-batch27-postgres-rls-inspection.mjs";
const tables=["account_contexts","account_memberships","auth_sessions",
 "identity_assertion_receipts"];
const rows=tables.map(table_name=>({schema_name:"pay54",
 table_name,rls_enabled:true,rls_forced:true}));
const pool=data=>({async connect(){return{
 async query(statement,params){
  if(statement===sql)return{rows:data};
  return{rows:[]};
 },release(){}
}}});
test("1133: actual database RLS check is read only with fixed table list",async()=>{
 const r=await make({readPool:pool(rows)})();
 assert.equal(r.forceRlsTablesObserved,4);
 assert.equal(r.tenantCrossAccessNotTestedByThisQuery,true);
});
test("1133: missing FORCE RLS or any canonical table denies",async()=>{
 for(const d of [rows.slice(0,3),
  rows.map((x,i)=>i===2?{...x,rls_forced:false}:x)]){
  await assert.rejects(make({readPool:pool(d)})(),
   /STAGING_RLS_CATALOGUE_DENIED/);
 }
});
