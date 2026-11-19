"use strict";

/**
 * PAY54 Batch 24 / 955 — SQL migration 019/020 security review guard.
 * Preserve canonical migration order. This is a source inspection and cannot
 * substitute for DBA ACL review or authorise actual database migration.
 */
import { readFileSync } from "node:fs";
import { dirname,resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PAY54_BATCH23_MIGRATION_ORDER }
 from "./pay54-batch23-migration-drift.mjs";

export const PAY54_BATCH24_MIGRATIONS=Object.freeze([
 ...PAY54_BATCH23_MIGRATION_ORDER,
 "019_identity_assertion_bootstrap.sql",
 "020_initial_account_binding.sql"
]);
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../db/migrations");
const deny=()=>{throw new Error("PAY54_IDENTITY_MIGRATION_POLICY_DENIED");};

export function inspectPay54IdentityMigrations({
 readSource=file=>readFileSync(resolve(root,file),"utf8")
}={}){
 if(typeof readSource!=="function")deny();
 let issuer,binder;
 try{
  issuer=readSource("019_identity_assertion_bootstrap.sql");
  binder=readSource("020_initial_account_binding.sql");
 }catch{deny();}
 if(typeof issuer!=="string" || typeof binder!=="string" ||
    issuer.length<1000 || binder.length<1000)deny();
 const joined=issuer+"\n"+binder;
 if(/\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?pay54\.(?:account_contexts|account_memberships|auth_sessions)\b/i.test(joined) ||
    /\bSECURITY\s+INVOKER\b/i.test(joined) ||
    /\bGRANT\s+ALL\b/i.test(joined) ||
    /\bBYPASSRLS\b/i.test(joined.replaceAll("NOBYPASSRLS","")) ||
    /\bSUPERUSER\b/i.test(joined.replaceAll("NOSUPERUSER","")) ||
    /\bGRANT\s+(?:INSERT|UPDATE|DELETE)\s+ON\s+pay54\.(?:ledger_entries|financial_operations|wallets)/i.test(joined))deny();
 if(!/CREATE TABLE pay54\.identity_assertion_receipts/i.test(issuer) ||
    !/PRIMARY KEY \(issuer, assertion_id\)/i.test(issuer) ||
    !/CREATE FUNCTION pay54\.consume_identity_assertion_and_issue_bootstrap/i.test(issuer) ||
    !/OWNER TO pay54_session_issue_executor_role/i.test(issuer) ||
    !/GRANT EXECUTE ON FUNCTION pay54\.consume_identity_assertion_and_issue_bootstrap/i.test(issuer) ||
    !/CREATE POLICY pay54_issue_bootstrap_session/i.test(issuer) ||
    !/CREATE FUNCTION pay54\.bind_initial_account_session/i.test(binder) ||
    !/OWNER TO pay54_session_rotate_executor_role/i.test(binder) ||
    !/GRANT EXECUTE ON FUNCTION pay54\.bind_initial_account_session/i.test(binder) ||
    !/INSERT INTO pay54\.account_context_audit/i.test(binder) ||
    !/FOR UPDATE;/i.test(binder))deny();
 return Object.freeze({
  schema:"pay54.identity-migration-policy-v1",
  canonicalMigrationCount:PAY54_BATCH24_MIGRATIONS.length,
  assertionReceiptHasUniqueIssuerJti:true,
  initialBindingHasRowLockAndAudit:true,
  directDatabaseAccessAuthorised:false,
  productionMigrationAuthorised:false
 });
}
