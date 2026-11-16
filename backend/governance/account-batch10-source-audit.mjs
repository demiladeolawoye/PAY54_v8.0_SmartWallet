"use strict";

import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

/*
 * PAY54 Batch 10 item 240 — offline invariant audit.
 * This checks committed source only. It cannot verify live PostgreSQL roles,
 * TLS, credentials, audit durability or deployed cloud configuration.
 */
const root=new URL("../../",import.meta.url);
const read=path=>readFileSync(new URL(path,root),"utf8");
const REQUIRED=[
 "roleMigration","rlsMigration","custody","binding","pinnedPool",
 "epochGuard","receipt","auditedRead","sql022","sql023","sql024"
];

export function assessBatch10Source(sources){
 if (!sources || typeof sources!=="object" || Array.isArray(sources) ||
     REQUIRED.some(k=>typeof sources[k]!=="string" ||
       sources[k].length===0 || sources[k].length>80000)) {
  throw new TypeError("BATCH10_SOURCE_INVENTORY_REQUIRED");
 }
 const rules=[
  ["READER_ROLE_NOLOGIN",
   /CREATE ROLE pay54_account_reader_role\s+NOLOGIN\s+NOINHERIT/.test(sources.roleMigration)],
  ["DENY_ONLY_CUSTOMER_RLS",
   (sources.rlsMigration.match(/AS RESTRICTIVE FOR SELECT TO pay54_account_reader_role USING \(false\)/g)||[]).length===3],
  ["NO_CUSTOMER_GRANTS",
   !/GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|ALL)\s+ON\s+pay54\./i.test(sources.rlsMigration)],
  ["CUSTODY_NOT_LIVE",
   /liveCredentialAttested:\s*false/.test(sources.custody) &&
   /customerDataAccessEnabled:\s*false/.test(sources.custody)],
  ["BINDING_ORIGIN_REQUIRED",
   /issued\.has\(value\)/.test(sources.binding) &&
   /liveCredentialAttested:\s*false/.test(sources.binding)],
  ["POOL_TEST_ONLY_DISCARD",
   /issued\.environment\s*!==\s*"test"/.test(sources.pinnedPool) &&
   /client\.release\(true\)/.test(sources.pinnedPool) &&
   !/client\.query\(["'`]SET ROLE/i.test(sources.pinnedPool)],
  ["EPOCH_REVALIDATED_AFTER_CALLBACK",
   /const result=await callback\(issued\);\s*await check\(issued\);/.test(sources.epochGuard)],
  ["AUDIT_EXPLICIT_ACK",
   /acknowledgement\.persistenceConfirmed!==true/.test(sources.receipt) &&
   /sourceAckOnly:true/.test(sources.receipt) &&
   /durableStorageIndependentlyVerified:false/.test(sources.receipt)],
  ["DISCLOSURE_REQUIRES_AUDIT",
   /const receipt=await audit\.publish/.test(sources.auditedRead) &&
   /receipt\.receiptAccepted!==true/.test(sources.auditedRead)],
  ["SYNTHETIC_ROLES_AND_ROLLBACK",
   sources.sql022.includes("CREATE ROLE pay54_ci_batch10_alpha NOLOGIN") &&
   sources.sql022.includes("session_user = current_user") &&
   sources.sql022.includes("ROLLBACK;") &&
   sources.sql023.includes("set_config('pay54.actor'") &&
   sources.sql023.includes("ROLLBACK;")],
  ["ZERO_PERSISTENT_CUSTOMER_GRANTS",
   sources.sql024.includes("has_table_privilege(") &&
   sources.sql024.includes("'pay54.account_contexts','SELECT'") &&
   sources.sql024.includes("'pay54.personal_wallet_bindings','SELECT'")]
 ].map(([name,passed])=>Object.freeze({name,passed:Boolean(passed)}));
 return Object.freeze({
  passed:rules.every(r=>r.passed),
  rules:Object.freeze(rules),
  liveCredentialAttested:false,
  customerDataAccessEnabled:false,
  financialExecutionEnabled:false,
  productionRelease:"BLOCKED"
 });
}
export function loadBatch10Source(){
 const paths={
  roleMigration:"backend/db/migrations/012_account_read_role_baseline.sql",
  rlsMigration:"backend/db/migrations/013_account_rls_denial.sql",
  custody:"backend/security/account-credential-custody-policy.mjs",
  binding:"backend/security/account-credential-binding.mjs",
  pinnedPool:"backend/db/account-role-pinned-pool.mjs",
  epochGuard:"backend/security/account-credential-epoch-guard.mjs",
  receipt:"backend/security/account-audit-receipt-gate.mjs",
  auditedRead:"backend/security/account-receipt-audited-read.mjs",
  sql022:"backend/db/tests/022_account_batch10_session_role_attestation.sql",
  sql023:"backend/db/tests/023_account_batch10_guc_spoof_denial.sql",
  sql024:"backend/db/tests/024_account_batch10_no_grants_rollback.sql"
 };
 return Object.freeze(Object.fromEntries(
  Object.entries(paths).map(([key,path])=>[key,read(path)])
 ));
}
if (process.argv[1]===fileURLToPath(import.meta.url)) {
 const result=assessBatch10Source(loadBatch10Source());
 process.stdout.write(JSON.stringify(result,null,2)+"\n");
 if (!result.passed)process.exitCode=1;
}
