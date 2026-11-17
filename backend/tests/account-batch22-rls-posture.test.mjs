"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { assertPay54PostgresReadRole as verify, PAY54_PG_POSTURE_SQL }
  from "../src/postgres-rls-posture.mjs";

const permitted = {
  runtime_role: "pay54_read", restricted: true, table_count: 2,
  forced_rls: true, can_select: true, can_write: false
};
test("825: catalogue query verifies restricted no-bypass read-only role and forced RLS", async () => {
  const calls = [];
  const checked = await verify({
    client: { query: async (sql, params) => {
      calls.push({ sql, params });
      return { rows: [permitted] };
    } },
    tables: ["account_contexts", "account_memberships"]
  });
  assert.deepEqual(calls[0].params, [["account_contexts", "account_memberships"]]);
  assert.equal(calls[0].sql, PAY54_PG_POSTURE_SQL);
  assert.equal(checked.productionReleaseAuthorised, false);
  assert.ok(Object.isFrozen(checked));
});
test("825: superuser, BYPASSRLS, missing relation and write privilege deny", async () => {
  for (const problem of [
    { restricted: false }, { forced_rls: false }, { can_select: false },
    { can_write: true }, { table_count: 1 }, { runtime_role: "" }
  ]) {
    await assert.rejects(
      verify({ client: { query: async () => ({ rows: [{ ...permitted, ...problem }] }) },
        tables: ["account_contexts", "account_memberships"] }),
      /PG_RLS_POSTURE_DENIED/
    );
  }
});
test("825: attacker cannot choose unapproved SQL relation names", async () => {
  const client = { query: async () => { throw Error("should never execute"); } };
  for (const tables of [["account_contexts", "evil"], ["account_contexts", "account_contexts"], [],
    ["auth_sessions;DROP TABLE pay54.accounts"]]) {
    await assert.rejects(verify({ client, tables }), /PG_RLS_POSTURE_DENIED/);
  }
});
