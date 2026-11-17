"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifyPay54RotationMigrationSource as verify }
  from "../governance/pay54-batch23-rotation-migration.mjs";

const actual = readFileSync(
  new URL("../db/migrations/018_account_session_rotation.sql", import.meta.url),
  "utf8"
);
test("883: canonical migrations and unassigned SECURITY INVOKER rotation are required", () => {
  const value = verify();
  assert.equal(value.baselineMigrationCount, 17);
  assert.equal(value.restrictedSecurityDefinerOwnerRequired, true);
  assert.equal(value.publicAndCallerDirectDmlForbidden, true);
  assert.equal(value.productionMigrationAuthorised, false);
  assert.equal(value.realAccountSwitchEnabled, false);
  assert.ok(Object.isFrozen(value));
});

test("883: privilege escalation, missing revoke and weakened row lock are denied", () => {
  const mutations = [
    actual.replace("LANGUAGE plpgsql SECURITY DEFINER",
      "LANGUAGE plpgsql SECURITY INVOKER"),
    actual.replace("REVOKE ALL ON FUNCTION pay54.rotate_account_context_session",
      "REVOKE ALL ON FUNCTION pay54.other_function"),
    actual.replace("FOR UPDATE;", "FOR SHARE;"),
    actual.replace("OWNER TO pay54_session_rotate_executor_role",
      "OWNER TO postgres"),
    actual + "\nGRANT UPDATE ON pay54.ledger_entries TO pay54_session_rotate_role;"
  ];
  for (const source of mutations) assert.throws(
    () => verify({ readMigration: () => source }),
    /SESSION_MIGRATION_INVENTORY_DENIED/
  );
  assert.throws(() => verify({ verifyCanonical: () => ({ canonicalMigrationCount: 12 }) }),
    /SESSION_MIGRATION_INVENTORY_DENIED/);
});
