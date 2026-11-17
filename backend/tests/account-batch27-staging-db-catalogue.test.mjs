"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createPay54StagingDbCatalogueObserver as make,
 PAY54_STAGING_CATALOGUE_SQL}
 from "../src/pay54-batch27-staging-db-catalogue.mjs";
const roles=["pay54_account_directory_read_role","pay54_session_issue_role",
 "pay54_session_read_role","pay54_session_rotate_role"];
const rows=roles.map(role=>({role,can_login:false,superuser:false,
 bypass_rls:false,inherits:false,member_count:0}));
function setup(data=rows){
 const calls=[],releases=[];
 return {calls,releases,pool:{
  async connect(){return{async query(sql,params){
   calls.push({sql,params});
   if(sql===PAY54_STAGING_CATALOGUE_SQL)return{rows:data};
   return{rows:[]};
  },release(discard){releases.push(Boolean(discard));}};}
 }};
}
test("1111: trusted catalog observation uses read-only repeatable read with parameterised roles",async()=>{
 const f=setup(),r=await make({readPool:f.pool})();
 assert.equal(r.checkedRoleCount,4);
 assert.equal(r.runtimeLoginPermissionsProven,false);
 assert.equal(f.calls[0].sql,"BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
 assert.deepEqual(f.calls.at(-1),{sql:"COMMIT",params:undefined});
 assert.equal(f.releases[0],false);
});
test("1111: unexpected LOGIN, BYPASSRLS and missing role fail transaction",async()=>{
 for(const input of [
  rows.map((x,i)=>i===0?{...x,can_login:true}:x),
  rows.map((x,i)=>i===1?{...x,bypass_rls:true}:x),
  rows.slice(0,3)
 ]){
  const f=setup(input);
  await assert.rejects(make({readPool:f.pool})(),
  /STAGING_DB_CATALOGUE_DENIED/);
  assert.equal(f.calls.at(-1).sql,"ROLLBACK");
 }
});
