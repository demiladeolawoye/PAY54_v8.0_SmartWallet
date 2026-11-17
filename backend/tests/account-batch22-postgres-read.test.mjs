"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { createPay54PostgresReadTransaction as make }
  from "../src/postgres-account-read-transaction.mjs";

const actor = "11111111-1111-4111-8111-111111111111";
const makePool = ({ failOn, rows = [], actorOverride } = {}) => {
  const calls = [];
  let released = 0;
  let discarded = false;
  const client = {
    async query(sql, values) {
      calls.push({ sql, values });
      if (failOn && sql.startsWith(failOn)) throw Error("db failed");
      if (sql.includes("FROM pg_class c")) return { rows: [{
        runtime_role: "pay54_read", restricted: true,
        table_count: 2, forced_rls: true, can_select: true, can_write: false
      }] };
      if (sql.startsWith("SELECT current_setting"))
        return { rows: [{ actor_id: actorOverride ?? actor }] };
      return { rows };
    },
    release(broken = false) { released++; discarded = broken; }
  };
  return { calls, get released() { return released; },
    get discarded() { return discarded; },
    connect: async () => client };
};
test("820: scoped read uses parameterized actor binding and read-only transaction", async () => {
  const pool = makePool();
  const run = make({ pool });
  const value = await run(actor, async tx => {
    assert.equal(tx.actorId, actor);
    assert.equal(tx.readOnly, true);
    assert.equal(tx.rlsEnforced, true);
    assert.ok(Object.isFrozen(tx));
    await tx.listAccounts();
    await tx.listMemberships();
    return "checked";
  });
  assert.equal(value, "checked");
  assert.equal(pool.calls[0].sql, "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  assert.deepEqual(pool.calls[2].values, [actor]);
  assert.equal(pool.calls[2].sql, "SELECT set_config('pay54.actor_id', $1::text, true)");
  assert.ok(pool.calls.some(x => x.sql.includes("FROM pay54.account_contexts")));
  assert.ok(pool.calls.some(x => x.sql.includes("FROM pay54.account_memberships")));
  assert.equal(pool.calls.at(-1).sql, "COMMIT");
  assert.equal(pool.released, 1);
});

test("820: binding mismatch or query failure rolls back and does not leak client", async () => {
  for (const options of [
    { actorOverride: "99999999-9999-4999-8999-999999999999" },
    { failOn: "SELECT current_setting" },
    { failOn: "SELECT account_id" }
  ]) {
    const pool = makePool(options);
    const run = make({ pool });
    await assert.rejects(run(actor, async tx => {
      await tx.listAccounts();
      return "must not commit";
    }), /PG_SCOPED_READ_UNAVAILABLE/);
    assert.equal(pool.calls.at(-1).sql, "ROLLBACK");
    assert.equal(pool.released, 1);
    assert.equal(pool.calls.some(x => x.sql === "COMMIT"), false);
  }
});

test("820: missing pool or untrusted actor is rejected before SQL", async () => {
  assert.throws(() => make({}), /PG_SCOPED_READ_UNAVAILABLE/);
  const pool = makePool();
  await assert.rejects(make({ pool })("forged", async () => {}),
    /PG_SCOPED_READ_UNAVAILABLE/);
  assert.equal(pool.calls.length, 0);
});
