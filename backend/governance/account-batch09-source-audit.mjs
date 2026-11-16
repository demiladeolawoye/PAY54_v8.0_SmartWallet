"use strict";

/* Offline static invariants. A passing source audit cannot attest a live
 * PostgreSQL login, cloud IAM, network, customer identity or audit sink.
 */
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const root=new URL("../../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");

export function assessBatch09Source(inventory){
 const keys=["readerMigration","rlsMigration","actorPolicy","actorAttestation",
  "connectionProvenance","sqlProof","membership","audit"];
 if(!inventory||typeof inventory!=="object"||
    keys.some(k=>typeof inventory[k]!=="string"||inventory[k].length>40000)){
  throw new TypeError("BATCH09_SOURCE_INVENTORY_REQUIRED");
 }
 const rules=[
  ["READER_STILL_NOLOGIN",
   /CREATE ROLE pay54_account_reader_role\s+NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE\s+NOREPLICATION NOBYPASSRLS;/.test(inventory.readerMigration)],
  ["THREE_RESTRICTIVE_DENIAL_POLICIES",
   (inventory.rlsMigration.match(/AS RESTRICTIVE FOR SELECT TO pay54_account_reader_role USING \(false\)/g)||[]).length===3 &&
   ["pay54_reader_account_deny","pay54_reader_membership_deny","pay54_reader_wallet_binding_deny"]
    .every(n=>inventory.rlsMigration.includes("CREATE POLICY "+n))],
  ["NO_PAY54_CUSTOMER_ROLE_GRANTS",
   !/GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|ALL)\s+ON\s+pay54\./i.test(inventory.rlsMigration)],
  ["ACTOR_SUPERUSER_DENIED",
   /metadata\.superuser!==false/.test(inventory.actorPolicy)&&
   /metadata\.bypassRls!==false/.test(inventory.actorPolicy)&&
   /metadata\.canAssumeOtherTenantRoles!==false/.test(inventory.actorPolicy)],
  ["SESSION_AND_CURRENT_USER_PROOF",
   /session_user::text AS session_user_name/.test(inventory.actorAttestation)&&
   /current_user::text AS current_user_name/.test(inventory.actorAttestation)],
  ["NO_FABRICATED_ACTOR_CAPABILITIES",
   /external\.hasFinancialPrivilege!==false/.test(inventory.connectionProvenance)&&
   /external\.canAssumeOtherTenantRoles!==false/.test(inventory.connectionProvenance)&&
   /hasFinancialPrivilege:external\.hasFinancialPrivilege/.test(inventory.connectionProvenance)],
  ["SIGNED_IN_IDENTITY_REQUIRED",
   /requireAccountDbPrincipal\s*\(/.test(inventory.connectionProvenance)],
  ["DISPOSABLE_TEST_ONLY_ACL",
   /CREATE ROLE pay54_ci_actor_alpha NOLOGIN/.test(inventory.sqlProof)&&
   /SET ROLE pay54_ci_actor_beta;/.test(inventory.sqlProof)&&
   /ROLLBACK;/.test(inventory.sqlProof)],
  ["CURRENT_ACCOUNT_MEMBERSHIP_CHECK",
   /assertTenantAccountAccess\s*\(/.test(inventory.membership)&&
   /loadCurrent\s*\(/.test(inventory.membership)],
  ["AUDIT_BEFORE_DISCLOSURE",
   /await audit\.publish\(\{operation:"ACCOUNT_SELECT",outcome:"ALLOWED"/.test(inventory.audit)],
  ["NO_SQL_ROLE_SWITCH_IN_PROVENANCE",
   !/client\.query\(["']SET ROLE/.test(inventory.connectionProvenance)]
 ].map(([name,passed])=>Object.freeze({name,passed:Boolean(passed)}));
 return Object.freeze({passed:rules.every(rule=>rule.passed),
  rules:Object.freeze(rules),liveAttested:false,customerDataGrantsAllowed:false,
  cloudProvisioning:"DISABLED",financialExecution:"DISABLED",productionRelease:"BLOCKED"});
}

export function loadBatch09Source(){
 return Object.freeze({
  readerMigration:read("backend/db/migrations/012_account_read_role_baseline.sql"),
  rlsMigration:read("backend/db/migrations/013_account_rls_denial.sql"),
  actorPolicy:read("backend/security/account-db-actor-policy.mjs"),
  actorAttestation:read("backend/db/account-db-attestation-query.mjs"),
  connectionProvenance:read("backend/db/account-connection-provenance.mjs"),
  sqlProof:read("backend/db/tests/019_account_role_acl_proof.sql"),
  membership:read("backend/domain/account-current-membership.mjs"),
  audit:read("backend/security/account-read-audit-gate.mjs")
 });
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const result=assessBatch09Source(loadBatch09Source());
 process.stdout.write(JSON.stringify(result,null,2)+"\n");
 if(!result.passed)process.exitCode=1;
}
