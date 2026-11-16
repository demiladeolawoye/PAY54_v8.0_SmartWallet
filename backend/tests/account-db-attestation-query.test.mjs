"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {ACCOUNT_ACTOR_ATTESTATION_SQL,projectAccountActorAttestation}
 from "../db/account-db-attestation-query.mjs";
const ROLE="pay54_tenant_verified_0001";
const row={current_user_name:ROLE,session_user_name:ROLE,can_login:true,superuser:false,
 bypass_rls:false,inherit:false,create_role:false,create_db:false,
 replication:false,memberships_count:0,row_security_enabled:true,
 customer_table_ownership_count:0};
test("actor SQL is static read-only and observes session_user, RLS and memberships",()=>{
 assert.match(ACCOUNT_ACTOR_ATTESTATION_SQL,/session_user::text/);
 assert.match(ACCOUNT_ACTOR_ATTESTATION_SQL,/pg_auth_members/);
 assert.match(ACCOUNT_ACTOR_ATTESTATION_SQL,/rolbypassrls/);
 assert.doesNotMatch(ACCOUNT_ACTOR_ATTESTATION_SQL,/SET ROLE|INSERT INTO|UPDATE pay54/i);
 const result=projectAccountActorAttestation({rows:[row]});
 assert.equal(result.currentUser,ROLE);
 assert.equal(result.sessionUser,ROLE);
 assert.equal(result.isOwnerOfCustomerTables,false);
});
test("multiple, incomplete, malformed or contradictory actor result shapes reject",()=>{
 for(const value of [null,{rows:[]},{rows:[row,row]},{rows:[{...row,bypass_rls:null}]},
   {rows:[{...row,memberships_count:"0"}]},{rows:[{...row,current_user_name:12}]}]){
  assert.throws(()=>projectAccountActorAttestation(value),/ACTOR_ATTESTATION_UNAVAILABLE/);
 }
});
