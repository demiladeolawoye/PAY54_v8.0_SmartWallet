"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessAccountReaderRoleInventory} from "../governance/account-reader-role-audit.mjs";
const safe={roles:[{oid:42,rolname:"pay54_account_reader_role",rolcanlogin:false,rolsuper:false,
 rolinherit:false,rolbypassrls:false,rolcreatedb:false,rolcreaterole:false,rolreplication:false}],
 memberships:[],grants:[{grantee:"pay54_account_reader_role",privilege:"USAGE_SCHEMA"}]};
test("no-login unassigned no-data account reader role passes snapshot policy",()=>{
 const value=assessAccountReaderRoleInventory(safe);
 assert.equal(value.passed,true);
 assert.equal(value.liveRoleAttested,false);
});
test("a login, bypass, group membership or customer grant rejects reader",()=>{
 for(const snapshot of [
  {...safe,roles:[{...safe.roles[0],rolcanlogin:true}]},
  {...safe,roles:[{...safe.roles[0],rolbypassrls:true}]},
  {...safe,memberships:[{roleid:42,member:99}]},
  {...safe,grants:[...safe.grants,{grantee:"pay54_account_reader_role",privilege:"SELECT"}]},
  {...safe,roles:[]}
 ])assert.equal(assessAccountReaderRoleInventory(snapshot).passed,false);
});
test("untrusted incomplete role inventory raises",()=>{
 assert.throws(()=>assessAccountReaderRoleInventory({}),TypeError);
});
