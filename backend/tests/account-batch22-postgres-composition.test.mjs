"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { createPay54PostgresAccountDirectoryComposition as compose }
  from "../src/postgres-account-composition.mjs";

const actor = "11111111-1111-4111-8111-111111111111";
const accountId = "22222222-2222-4222-8222-222222222222";
const token = randomBytes(32).toString("base64url");
const digest = createHash("sha256").update(Buffer.from(token, "base64url")).digest("hex");
const ctx = { headers: { authorization: "Bearer " + token } };
const makePool = ({ type, badRole = false, otherActor = false } = {}) => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("FROM pg_class c")) return { rows: [{
        runtime_role: "pay54_reader", restricted: !badRole, forced_rls: true,
        table_count: type === "session" ? 1 : 2,
        can_select: true, can_write: false
      }] };
      if (sql.includes("current_setting"))
        return { rows: type === "session"
          ? [{ digest }] : [{ actor_id: actor }] };
      if (sql.includes("FROM pay54.auth_sessions"))
        return { rows: [{
          sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          principalId: otherActor ? accountId : actor,
          activeAccountId: accountId, status: "ACTIVE",
          version: "2", issuedAtMs: "1000", expiresAtMs: "5000"
        }] };
      if (sql.includes("FROM pay54.account_contexts")) return { rows: [{
        accountId, legalOwnerId: actor, type: "PERSONAL",
        displayName: "PAY54 Personal", status: "ACTIVE", verificationStatus: "VERIFIED"
      }] };
      if (sql.includes("FROM pay54.account_memberships")) return { rows: [{
        accountId, principalId: actor, role: "PERSONAL_OWNER", status: "ACTIVE"
      }] };
      return { rows: [] };
    },
    release() {}
  };
  return { calls, connect: async () => client };
};
test("829: authenticated digest -> RLS actor -> authorised account with separate pools", async () => {
  const sessions = makePool({ type: "session" });
  const accounts = makePool({ type: "accounts" });
  const service = compose({
    sessionReadPool: sessions, accountReadPool: accounts,
    getTrustedServerTimeMs: () => 2000
  });
  const result = await service.listAuthorisedAccounts(ctx);
  assert.equal(result.accounts.length, 1);
  assert.equal(result.accounts[0].accountId, accountId);
  assert.equal(result.accounts[0].financialOperationAuthorised, false);
  assert.equal(result.accountSwitchCompleted, false);
  assert.equal(accounts.calls.filter(x => x.sql.includes("set_config"))[0].params[0], actor);
  assert.equal(sessions.calls.filter(x => x.sql.includes("set_config"))[0].params[0], digest);
  assert.equal(JSON.stringify(accounts.calls).includes(token), false);
});
test("829: unsafe database role and mismatched principal fail closed", async () => {
  for (const [sessionBad, accountBad, otherActor] of [
    [true, false, false], [false, true, false], [false, false, true]
  ]) {
    const service = compose({
      sessionReadPool: makePool({ type: "session", badRole: sessionBad, otherActor }),
      accountReadPool: makePool({ type: "accounts", badRole: accountBad }),
      getTrustedServerTimeMs: () => 2000
    });
    await assert.rejects(service.listAuthorisedAccounts(ctx), /SERVICE_UNAVAILABLE/);
  }
});
test("829: missing, shared or invalid pools deny creation", () => {
  const pool = makePool({ type: "accounts" });
  assert.throws(() => compose({}), /PG_ACCOUNT_COMPOSITION_UNAVAILABLE/);
  assert.throws(() => compose({ sessionReadPool: pool, accountReadPool: pool }),
    /PG_ACCOUNT_COMPOSITION_UNAVAILABLE/);
});
