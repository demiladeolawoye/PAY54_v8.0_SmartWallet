"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {assessAccountDbIdentitySafety,loadAccountDbIdentitySafetySources}
 from "../governance/account-db-identity-safety.mjs";

test("Batch 08 source boundaries require three denial policies and no live grants",()=>{
 const outcome=assessAccountDbIdentitySafety(loadAccountDbIdentitySafetySources());
 assert.equal(outcome.passed,true,JSON.stringify(outcome.rules));
 assert.equal(outcome.productionGrantsAllowed,false);
 assert.equal(outcome.liveDatabaseAttested,false);
});
test("grant, actor-check, role-switch, ticket and SQL weakening mutations fail",()=>{
 const src=loadAccountDbIdentitySafetySources();
 const changes=[
  {readerRole:src.readerRole.replace("  NOLOGIN NOINHERIT","  LOGIN NOINHERIT")},
  {denyMigration:src.denyMigration.replace("AS RESTRICTIVE FOR SELECT","AS PERMISSIVE FOR SELECT")},
  {denyMigration:src.denyMigration+" GRANT SELECT ON pay54.account_contexts TO pay54_account_reader_role;"},
  {actorTransaction:src.actorTransaction.replace('await client.query("SELECT current_user::text AS actor")','await client.query("SELECT 1 AS actor")')},
  {actorTransaction:src.actorTransaction.replace("actor.rows[0]?.actor!==descriptor.roleName","false")},
  {actorTransaction:src.actorTransaction+' client.query("SET ROLE pay54_tenant_admin");'},
  {actorTransaction:src.actorTransaction.replace('BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED READ ONLY','BEGIN')},
  {ticket:src.ticket.replace("state.used=true","state.used=false")},
  {proof:src.proof.replace("ROLLBACK;","COMMIT;")},
  {sqlPolicy:src.sqlPolicy.replace("identifyAccountQuery(sql)","null")}
 ];
 for(const change of changes)assert.equal(assessAccountDbIdentitySafety({...src,...change}).passed,false,
   Object.keys(change)[0]);
});
test("incomplete or unknown security inventory cannot pass",()=>{
 assert.throws(()=>assessAccountDbIdentitySafety(null),TypeError);
 assert.throws(()=>assessAccountDbIdentitySafety({}),TypeError);
});
