"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {createAccountDbRoleRegistry} from "../governance/account-db-role-registry.mjs";
const P="11111111-1111-4111-8111-111111111111",Q="22222222-2222-4222-8222-222222222222";
const roleA="pay54_tenant_safe_0001",roleB="pay54_tenant_safe_0002";
test("approved registry identity mapping cannot alias or guess a database actor",()=>{
 const r=createAccountDbRoleRegistry({rows:[
  {subjectId:P,roleName:roleA,active:true},{subjectId:Q,roleName:roleB,active:true}
 ]});
 assert.equal(r.assertMapping(P,roleA),true);
 assert.equal(r.assertMapping(P,roleB),false);
 assert.equal(r.expectedRole(Q),roleB);
 assert.equal(r.liveDbVerified,false);
});
test("duplicates, revoked roles and elevated DB actor names fail closed",()=>{
 for(const rows of [
  [{subjectId:P,roleName:"postgres",active:true}],
  [{subjectId:P,roleName:roleA,active:false}],
  [{subjectId:P,roleName:roleA,active:true},{subjectId:P,roleName:roleB,active:true}],
  [{subjectId:P,roleName:roleA,active:true},{subjectId:Q,roleName:roleA,active:true}],
  [{subjectId:P,roleName:roleA,active:true,grant:"SELECT"}]
 ])assert.throws(()=>createAccountDbRoleRegistry({rows}),/DB_ROLE_REGISTRY_/);
});
