"use strict";

/* PAY54 Batch 07 — offline fail-closed account source policy.
 * Source evidence is not an attestation of live database, IAM or payments.
 */
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

const base=new URL("../../",import.meta.url);
const read=path=>readFileSync(new URL(path,base),"utf8");

export function assessBatch07Safety(inventory) {
  if(!inventory||typeof inventory!=="object"||
      ["identity","scope","migration","queries","transaction","roles"].some(k=>
        typeof inventory[k]!=="string" || inventory[k].length>50000)){
    throw new TypeError("ACCOUNT_SAFETY_INVENTORY_REQUIRED");
  }
  const checks=[
    ["TRUSTED_IDENTITY",/requireTrustedPrincipal\s*\(/.test(inventory.identity) &&
      /WeakSet/.test(read("backend/security/account-identity-envelope.mjs"))],
    ["CURRENT_MEMBERSHIP",/const verdict=assertTenantAccountAccess\s*\(/.test(inventory.scope)],
    ["RESTRICTIVE_RLS",(inventory.migration.match(/AS RESTRICTIVE FOR SELECT TO pay54_account_reader_role USING \(false\)/g)||[]).length===3 && ["pay54_reader_account_deny","pay54_reader_membership_deny","pay54_reader_wallet_binding_deny"].every(name=>inventory.migration.includes("CREATE POLICY "+name))],
    ["NO_READER_SELECT_GRANT",!/GRANT\s+(?:SELECT|ALL)\s+ON\s+/i.test(inventory.migration)],
    ["NO_DB_TENANT_GUC",!/current_setting\s*\(|set_config\s*\(/i.test(inventory.migration)],
    ["CANONICAL_PARAMETER_SQL",/buildAccountQuery\s*\(/.test(inventory.queries)],
    ["READ_ONLY_TRANSACTION",/BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED READ ONLY/.test(inventory.transaction)],
    ["NO_LOGIN_READER",/CREATE ROLE pay54_account_reader_role\s+NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE\s+NOREPLICATION NOBYPASSRLS;/.test(inventory.roles)],
    ["NO_DEPLOY_COMMANDS",!/terraform\s+apply|gcloud\s+run\s+deploy|psql\s+-h\s+.*production/i.test(
      inventory.identity+"\n"+inventory.scope+"\n"+inventory.transaction)]
  ].map(([name,passed])=>Object.freeze({name,passed:Boolean(passed)}));
  return Object.freeze({
    passed:checks.every(c=>c.passed),
    checks:Object.freeze(checks),
    sourceOnly:true,
    liveAttested:false,
    cloudProvisioning:"DISABLED",
    financialExecution:"DISABLED",
    stagingRelease:"BLOCKED"
  });
}

export function loadBatch07SafetyInventory() {
  return Object.freeze({
    identity:read("backend/security/account-identity-envelope.mjs"),
    scope:read("backend/http/account-request-scope.mjs"),
    migration:read("backend/db/migrations/013_account_rls_denial.sql"),
    queries:read("backend/db/account-tenant-query-guard.mjs"),
    transaction:read("backend/db/account-read-transaction.mjs"),
    roles:read("backend/db/migrations/012_account_read_role_baseline.sql")
  });
}

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const result=assessBatch07Safety(loadBatch07SafetyInventory());
 process.stdout.write(JSON.stringify(result,null,2)+"\n");
 if(!result.passed)process.exitCode=1;
}
