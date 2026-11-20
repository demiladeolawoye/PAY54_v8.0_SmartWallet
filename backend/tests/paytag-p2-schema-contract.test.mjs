"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";

const sql=readFileSync(fileURLToPath(new URL("../db/migrations/021_paytag_registry_foundation.sql",import.meta.url)),"utf8");
const required=(text)=>assert.ok(sql.includes(text), "missing required SQL clause: "+text);
const forbidden=(pattern)=>assert.doesNotMatch(sql,pattern);

test("P2A migration uses a transaction and checks all account foundations",()=>{
  required("BEGIN;");required("COMMIT;");
  for(const table of ["account_contexts","personal_wallet_bindings","account_memberships","auth_sessions"])
    required("to_regclass('pay54."+table+"') IS NULL");
  required("PAY54_PAYTAG_P2A_MIGRATION_REVIEW_REQUIRED");
});
test("P2A alias namespace is unique for life and forbids active duplicates",()=>{
  required("canonical_alias varchar(24) NOT NULL UNIQUE");
  required("CREATE UNIQUE INDEX paytag_one_current_tag_per_account");
  required("registry_state IN ('RESERVED','ACTIVE')");
  required("canonical_alias NOT IN");
  required("canonical_alias !~ '^pay54");
  required("canonical_alias ~ '^[a-z]");
});
test("P2A schema references established wallet/account ownership and records audit identity",()=>{
  required("REFERENCES pay54.personal_wallet_bindings(wallet_id,account_id)");
  required("REFERENCES pay54.account_contexts(id)");
  required("REFERENCES pay54.paytag_registry(tag_id,owner_account_id,owner_principal_id)");
  required("correlation_id uuid NOT NULL");
  required("alias_version bigint NOT NULL");
});
test("P2A is strictly deny-by-default: FORCE RLS with zero executable grants",()=>{
  for(const table of ["paytag_registry","paytag_registry_audit"]){
    required("ALTER TABLE pay54."+table+" ENABLE ROW LEVEL SECURITY");
    required("ALTER TABLE pay54."+table+" FORCE ROW LEVEL SECURITY");
    required("REVOKE ALL ON pay54."+table+" FROM PUBLIC");
    required("REVOKE ALL ON pay54."+table+" FROM pay54_financial_app_role");
  }
  forbidden(/\bCREATE POLICY\b/);
  forbidden(/\bGRANT (?:INSERT|UPDATE|DELETE|SELECT|ALL|EXECUTE)\b/);
  forbidden(/\bSECURITY DEFINER\b/);
  forbidden(/\bINSERT INTO pay54\.paytag_registry\b/);
});
