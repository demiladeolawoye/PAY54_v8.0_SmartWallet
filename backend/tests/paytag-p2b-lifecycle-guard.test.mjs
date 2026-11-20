"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
const sql=readFileSync(fileURLToPath(new URL("../db/migrations/022_paytag_lifecycle_guard.sql",import.meta.url)),"utf8");
test("P2B-A requires registry foundations and forbids duplicate apply",()=>{
  for(const x of ["BEGIN;","COMMIT;","paytag_registry_audit","personal_wallet_bindings","PAY54_PAYTAG_P2B_PREREQUISITES_MISSING","PAY54_PAYTAG_P2B_DUPLICATE_MIGRATION"])
    assert.ok(sql.includes(x),x);
});
test("P2B-A locks owner and wallet, rechecks verified personal membership",()=>{
  for(const x of ["FROM pay54.account_contexts","FROM pay54.wallets","FROM pay54.account_memberships","FOR SHARE","'PERSONAL'","'VERIFIED'","'PERSONAL_OWNER'","PAY54_PAYTAG_ACCOUNT_SCOPE_DENIED"])
    assert.ok(sql.includes(x),x);
});
test("P2B-A prohibits reassignment, replay, invalid transition and physical deletion",()=>{
  for(const x of ["NEW.canonical_alias IS DISTINCT FROM OLD.canonical_alias","NEW.owner_principal_id IS DISTINCT FROM OLD.owner_principal_id","OLD.registry_state = 'RETIRED'","NEW.registry_version <> OLD.registry_version + 1","paytag_registry_delete_deny_trigger","paytag_registry_audit_immutable_trigger"])
    assert.ok(sql.includes(x),x);
});
test("P2B-A records durable lifecycle events without granting registration authority",()=>{
  for(const x of ["paytag_registry_audit_append_trigger","'CLAIMED'","'ACTIVATED'","'RETIRED'","FORCE ROW LEVEL SECURITY","REVOKE EXECUTE"])
    assert.ok(sql.includes(x),x);
  assert.doesNotMatch(sql,/^\s*GRANT\s+(?:ALL|INSERT|UPDATE|DELETE|SELECT|EXECUTE)\b/im);
  assert.doesNotMatch(sql,/\bSECURITY DEFINER\b/i);
  assert.doesNotMatch(sql,/\bCREATE POLICY\b/i);
});
