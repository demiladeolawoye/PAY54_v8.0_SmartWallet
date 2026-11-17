"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { probePay54StagingDatabaseRoles as probe }
  from "../src/postgres-staging-role-probe.mjs";

const expected = [
  "pay54_session_read_role",
  "pay54_account_directory_read_role",
  "pay54_session_rotate_role"
];

function pool(role, { unsafe = false, fail = false } = {}) {
  const calls = [];
  const releases = [];
  const p = {
    calls, releases,
    async connect() {
      return {
        async query(sql, params) {
          calls.push({ sql, params });
          if (fail && sql.includes("FROM pg_class")) throw Error("private-host");
          if (sql.includes("FROM pg_class")) return { rows: [{
            runtime_role: role, restricted: !unsafe,
            table_count: params[0].length, forced_rls: true,
            can_select: true, can_write: false
          }] };
          if (sql === "SELECT current_user AS role_name")
            return { rows: [{ role_name: role }] };
          if (sql.startsWith("SELECT current_user AS role_name"))
            return { rows: [{
              role_name: role, restricted: !unsafe,
              may_rotate: !unsafe, may_write_ledger: unsafe
            }] };
          return { rows: [] };
        },
        release(discard = false) { releases.push(discard); }
      };
    }
  };
  return p;
}
const pools = () => ({
  sessionReadPool: pool(expected[0]),
  accountReadPool: pool(expected[1]),
  sessionRotationPool: pool(expected[2])
});

test("890: three separate database roles are verified without reading customer rows", async () => {
  const p = pools();
  const result = await probe(p);
  assert.equal(result.restrictedRolesVerified, true);
  assert.equal(result.customerCredentialIssued, false);
  assert.equal(result.productionReleaseAuthorised, false);
  assert.ok(Object.isFrozen(result));
  for (const which of Object.keys(p)) {
    assert.equal(p[which].calls[0].sql,
      "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    assert.equal(p[which].calls.at(-1).sql, "COMMIT");
    assert.deepEqual(p[which].releases, [false]);
  }
});

test("890: wrong effective role and privileged rotator fail without release approval", async () => {
  const wrong = pools();
  wrong.sessionRotationPool = pool("postgres");
  await assert.rejects(probe(wrong), /STAGING_ROLE_PROBE_DENIED/);
  const privileged = pools();
  privileged.sessionRotationPool = pool(expected[2], { unsafe: true });
  await assert.rejects(probe(privileged), /STAGING_ROLE_PROBE_DENIED/);
  const badReader = pools();
  badReader.accountReadPool = pool(expected[1], { unsafe: true });
  await assert.rejects(probe(badReader), /STAGING_ROLE_PROBE_DENIED/);
});

test("890: transport failure rolls back and masks internal database error", async () => {
  const p = pools();
  p.accountReadPool = pool(expected[1], { fail: true });
  await assert.rejects(probe(p), err => {
    assert.equal(err.message, "PAY54_STAGING_ROLE_PROBE_DENIED");
    assert.equal(err.message.includes("private-host"), false);
    return true;
  });
  assert.equal(p.accountReadPool.calls.at(-1).sql, "ROLLBACK");
  assert.deepEqual(p.accountReadPool.releases, [false]);
});

test("890: shared pool identities and missing dependencies are refused", async () => {
  const p = pools();
  await assert.rejects(probe({
    ...p, sessionRotationPool: p.accountReadPool
  }), /STAGING_ROLE_PROBE_DENIED/);
  await assert.rejects(probe({}), /STAGING_ROLE_PROBE_DENIED/);
});
