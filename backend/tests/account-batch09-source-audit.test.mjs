"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessBatch09Source,loadBatch09Source}
 from "../governance/account-batch09-source-audit.mjs";
test("Batch 09 source security proof preserves dormant reader and disabled launch",()=>{
 const result=assessBatch09Source(loadBatch09Source());
 assert.equal(result.passed,true,JSON.stringify(result.rules));
 assert.equal(result.liveAttested,false);
 assert.equal(result.financialExecution,"DISABLED");
 assert.equal(result.productionRelease,"BLOCKED");
});
test("source-level identity bypass and privilege escalations fail the guard",()=>{
 const source=loadBatch09Source();
 const mutations=[
  {readerMigration:source.readerMigration.replace("  NOLOGIN NOINHERIT","  LOGIN NOINHERIT")},
  {rlsMigration:source.rlsMigration.replace("AS RESTRICTIVE FOR SELECT","AS PERMISSIVE FOR SELECT")},
  {rlsMigration:source.rlsMigration+"\nGRANT SELECT ON pay54.account_contexts TO pay54_account_reader_role;"},
  {actorPolicy:source.actorPolicy.replace("metadata.superuser!==false","metadata.superuser!==true")},
  {actorPolicy:source.actorPolicy.replace("metadata.bypassRls!==false","metadata.bypassRls!==true")},
  {actorAttestation:source.actorAttestation.replace("session_user::text AS session_user_name","current_user::text AS session_user_name")},
  {connectionProvenance:source.connectionProvenance.replace("external.canAssumeOtherTenantRoles!==false","external.canAssumeOtherTenantRoles!==true")},
  {sqlProof:source.sqlProof.replace("SET ROLE pay54_ci_actor_beta;","SELECT 1;")},
  {membership:source.membership.replace("const decision=assertTenantAccountAccess(","const decision=acceptAnything(")},
  {audit:source.audit.replace('await audit.publish({operation:"ACCOUNT_SELECT",outcome:"ALLOWED"','void audit.publish({operation:"ACCOUNT_SELECT",outcome:"ALLOWED"')}
 ];
 for(const mutation of mutations){
  assert.equal(assessBatch09Source({...source,...mutation}).passed,false,
   Object.keys(mutation)[0]);
 }
});
test("incomplete source inventory fails closed",()=>{
 assert.throws(()=>assessBatch09Source({}),TypeError);
 assert.throws(()=>assessBatch09Source(null),TypeError);
});
