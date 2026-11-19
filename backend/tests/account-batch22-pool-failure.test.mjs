"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createPay54PostgresReadTransaction }
  from "../src/postgres-account-read-transaction.mjs";
import { createPay54PostgresSessionResolver }
  from "../src/postgres-session-resolver.mjs";

const actor = "11111111-1111-4111-8111-111111111111";
const token = randomBytes(32).toString("base64url");
const context = { headers: { authorization: "Bearer " + token } };

const makeBrokenPool = ({ auth = false } = {}) => {
  const calls = [];
  const releases = [];
  const client = {
    async query(sql, values) {
      calls.push(sql);
      if (sql === "ROLLBACK") throw Error("transport failed during rollback");
      if (sql.includes("FROM pg_class c")) return { rows: [{
        runtime_role: "pay54_restricted",
        restricted: true, table_count: auth ? 1 : 2,
        forced_rls: true, can_select: true, can_write: false
      }] };
      if (sql.startsWith("SELECT current_setting")) return { rows: [{
        ...(auth ? { digest: values?.[0] ?? "" } : { actor_id: actor })
      }] };
      if (sql.startsWith("SELECT set_config")) {
        if (auth) client.expectedDigest = values[0];
        return { rows: [] };
      }
      if (sql.includes("FROM pay54.auth_sessions")) return { rows: [] };
      if (sql.includes("FROM pay54.account_contexts")) throw Error("database read unavailable");
      return { rows: [] };
    },
    release(discard) { releases.push(discard); }
  };
  // Allow the isolated session credential verification to pass.
  const original = client.query;
  client.query = async function(sql, values) {
    if (sql.startsWith("SELECT current_setting") && auth) {
      calls.push(sql);
      return { rows: [{ digest: client.expectedDigest }] };
    }
    return original(sql, values);
  };
  return { connect: async () => client, calls, releases };
};

test("865: failed rollback discards account-read pool connection", async () => {
  const pool = makeBrokenPool();
  const run = createPay54PostgresReadTransaction({ pool });
  await assert.rejects(run(actor, async tx => {
    await tx.listAccounts();
  }), /PAY54_PG_SCOPED_READ_UNAVAILABLE/);
  assert.equal(pool.calls.at(-1), "ROLLBACK");
  assert.deepEqual(pool.releases, [true]);
  assert.equal(pool.calls.includes("COMMIT"), false);
});

test("865: failed rollback discards credential-session pool connection", async () => {
  const pool = makeBrokenPool({ auth: true });
  const resolve = createPay54PostgresSessionResolver({
    pool, getTrustedServerTimeMs: () => 2000
  });
  await assert.rejects(resolve(context), /PAY54_TRUSTED_SESSION_UNAVAILABLE/);
  assert.equal(pool.calls.at(-1), "ROLLBACK");
  assert.deepEqual(pool.releases, [true]);
});

test("865: connection establishment failures are redacted, never financial successes", async () => {
  const pool = { connect: async () => { throw new Error("private-db-hostname-secret"); } };
  await assert.rejects(createPay54PostgresReadTransaction({ pool })(
    actor, async () => "impossible"
  ), error => {
    assert.equal(error.message, "PAY54_PG_SCOPED_READ_UNAVAILABLE");
    assert.equal(error.message.includes("private-db-hostname-secret"), false);
    return true;
  });
  await assert.rejects(createPay54PostgresSessionResolver({ pool })(context),
    /TRUSTED_SESSION_UNAVAILABLE/);
});
