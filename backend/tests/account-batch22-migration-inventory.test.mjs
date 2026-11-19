"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assertPay54CanonicalMigrationInventory as verify,
  PAY54_CANONICAL_MIGRATION_ORDER as order
} from "../governance/pay54-batch22-migration-inventory.mjs";

const readCanonical = file =>
  readFileSync(new URL("../db/migrations/" + file, import.meta.url), "utf8");

test("861: only baseline 001–013 followed by additive 014–017 is accepted", () => {
  const result = verify();
  assert.equal(result.canonicalMigrationCount, 17);
  assert.equal(result.legacyDenyRolePreserved, true);
  assert.equal(result.authorisedToMigrate, false);
  assert.ok(Object.isFrozen(result));
  assert.deepEqual(order.slice(-4), [
    "014_auth_sessions.sql",
    "015_account_context_audit.sql",
    "016_session_account_integrity.sql",
    "017_account_directory_read_role.sql"
  ]);
});

test("861: overlapping account schema and reader privilege escalation are refused", () => {
  for (const replacement of [
    "CREATE TABLE pay54.account_memberships(account_id UUID);",
    "CREATE TABLE IF NOT EXISTS pay54.account_contexts(id UUID);",
    "GRANT SELECT ON pay54.account_contexts TO pay54_account_reader_role;"
  ]) {
    assert.throws(() => verify({
      getSource: name => name === "014_auth_sessions.sql"
        ? readCanonical(name) + "\n" + replacement
        : readCanonical(name)
    }), /MIGRATION_INVENTORY_DENIED/);
  }
});

test("861: missing migrations cannot be silently skipped or reordered", () => {
  assert.throws(() => verify({
    getSource: name => name === "008_account_context_foundation.sql" ? "" : readCanonical(name)
  }), /MIGRATION_INVENTORY_DENIED_EMPTY/);
  assert.throws(() => verify({ getSource: () => { throw Error("missing"); } }),
    /MIGRATION_INVENTORY_DENIED_MISSING/);
});
