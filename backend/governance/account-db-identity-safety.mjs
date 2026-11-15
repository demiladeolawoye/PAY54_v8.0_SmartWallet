"use strict";

/* PAY54 Batch 08 offline source checks. These are not live DB attestations. */
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const root=new URL("../../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");

export function assessAccountDbIdentitySafety(sources){
 if(!sources||typeof sources!=="object"||
   ["readerRole","denyMigration","actorTransaction","ticket","proof","sqlPolicy"].some(k=>
     typeof sources[k]!=="string"||sources[k].length>30000)){
  throw new TypeError("ACCOUNT_DB_SAFETY_SOURCE_REQUIRED");
 }
 const rules=[
  ["DORMANT_DATABASE_READER",/CREATE ROLE pay54_account_reader_role\s+NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE\s+NOREPLICATION NOBYPASSRLS;/.test(sources.readerRole)],
  ["NO_CUSTOMER_SELECT_GRANT",!/GRANT\s+(?:SELECT|ALL)\s+ON/i.test(sources.denyMigration)],
  ["ALL_RESTRICTIVE_DENIAL_POLICIES",[
    "pay54_reader_account_deny","pay54_reader_membership_deny","pay54_reader_wallet_binding_deny"
   ].every(name=>sources.denyMigration.includes("CREATE POLICY "+name))&&
   (sources.denyMigration.match(/AS RESTRICTIVE FOR SELECT TO pay54_account_reader_role USING \(false\)/g)||[]).length===3],
  ["NO_CLIENT_TRUSTED_GUC",!/current_setting\s*\(|set_config\s*\(/.test(sources.denyMigration)],
  ["READ_ONLY_ACTOR_TRANSACTION",/await client\.query\("BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED READ ONLY"\)/.test(sources.actorTransaction)],
  ["DB_EFFECTIVE_ROLE_VERIFICATION",/await client\.query\("SELECT current_user::text AS actor"\)/.test(sources.actorTransaction)&&
   /actor\.rows\[0\]\?\.actor!==descriptor\.roleName/.test(sources.actorTransaction)],
  ["NO_SET_ROLE_INSIDE_ACTOR_ADAPTER",!/client\.query\s*\(\s*["']\s*SET ROLE/i.test(sources.actorTransaction)],
  ["ACTOR_MISMATCH_FAIL_CLOSED",/throw new Error\("ACCOUNT_DB_ACTOR_MISMATCH"\)/.test(sources.actorTransaction)&&
   /client\.release\(failed!==null\)/.test(sources.actorTransaction)],
  ["SERVER_VERIFIED_QUERY",/requireAccountDbPrincipal\s*\(/.test(sources.actorTransaction)&&
   /assertAccountReadStatement\s*\(/.test(sources.actorTransaction)],
  ["SINGLE_USE_TICKET",/pending\.set\(ticket,/.test(sources.ticket)&&
   /state\.used=true/.test(sources.ticket)],
  ["ROLLBACK_TEST_ACTORS",/ROLLBACK;/.test(sources.proof)&&
    /CREATE ROLE pay54_ci_tenant_aa NOLOGIN/.test(sources.proof)&&
    /SET ROLE pay54_ci_tenant_bb;/.test(sources.proof)],
  ["PARAMETERIZED_QUERY_POLICY",/identifyAccountQuery\s*\(/.test(sources.sqlPolicy)]
 ].map(([name,passed])=>Object.freeze({name,passed:Boolean(passed)}));
 return Object.freeze({passed:rules.every(r=>r.passed),rules:Object.freeze(rules),
  liveDatabaseAttested:false,productionGrantsAllowed:false,
  stagingRelease:"BLOCKED",financialExecution:"DISABLED",cloudProvisioning:"DISABLED"});
}

export function loadAccountDbIdentitySafetySources(){
 return Object.freeze({
  readerRole:read("backend/db/migrations/012_account_read_role_baseline.sql"),
  denyMigration:read("backend/db/migrations/013_account_rls_denial.sql"),
  actorTransaction:read("backend/db/account-actor-transaction.mjs"),
  ticket:read("backend/security/account-read-ticket.mjs"),
  proof:read("backend/db/tests/016_role_identity_rls_proof.sql"),
  sqlPolicy:read("backend/db/account-sql-policy.mjs")
 });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const result=assessAccountDbIdentitySafety(loadAccountDbIdentitySafetySources());
 process.stdout.write(JSON.stringify(result,null,2)+"\n");
 if(!result.passed)process.exitCode=1;
}
