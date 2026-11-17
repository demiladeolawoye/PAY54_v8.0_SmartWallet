"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import {
  digestPay54BearerToken, extractPay54BearerCredential,
  createPay54PostgresSessionResolver
} from "../src/postgres-session-resolver.mjs";

const token = randomBytes(32).toString("base64url");
const digest = createHash("sha256").update(Buffer.from(token, "base64url")).digest("hex");
const session = {
  sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  principalId: "11111111-1111-4111-8111-111111111111",
  activeAccountId: "22222222-2222-4222-8222-222222222222",
  status: "ACTIVE", version: "4", issuedAtMs: "1000", expiresAtMs: "5000"
};
const ctx = { headers: { authorization: "Bearer " + token } };
const pool = (row = session) => {
  const calls = [];
  let released = false;
  return {
    calls, get released() { return released; },
    connect: async () => ({
      query: async (sql, values) => {
        calls.push({ sql, values });
        if (sql.includes("current_setting")) return { rows: [{ digest }] };
        if (sql.includes("FROM pay54.auth_sessions")) return { rows: row ? [row] : [] };
        return { rows: [] };
      },
      release: () => { released = true; }
    })
  };
};
test("823: strict bearer credential yields SHA256 digest without leaked raw token", () => {
  assert.equal(digestPay54BearerToken(token), digest);
  assert.equal(extractPay54BearerCredential(ctx), token);
  for (const credential of ["", "Bearer test", "bearer " + token,
    "Bearer " + token + "x", token]) {
    assert.throws(() =>
      extractPay54BearerCredential({ headers: { authorization: credential } }),
      /TRUSTED_SESSION_UNAVAILABLE/);
  }
});
test("823: PostgreSQL session comes only from a digest-scoped read-only transaction", async () => {
  const p = pool();
  const resolve = createPay54PostgresSessionResolver({
    pool: p, getTrustedServerTimeMs: () => 2000
  });
  const actual = await resolve(ctx);
  assert.equal(actual.principalId, session.principalId);
  assert.equal(actual.activeAccountId, session.activeAccountId);
  assert.equal(actual.version, 4);
  assert.ok(Object.isFrozen(actual));
  assert.equal(p.calls[0].sql, "BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  assert.deepEqual(p.calls[1].values, [digest]);
  assert.ok(p.calls.some(call => call.sql.includes("FROM pay54.auth_sessions")));
  assert.equal(p.calls.at(-1).sql, "COMMIT");
  assert.equal(JSON.stringify(p.calls).includes(token), false);
  assert.equal(p.released, true);
});
test("823: nonexistent, revoked and expired session rows fail closed", async () => {
  for (const row of [
    null, { ...session, status: "REVOKED" },
    { ...session, expiresAtMs: "2000" },
    { ...session, version: "0" },
    { ...session, principalId: "forged" }
  ]) {
    const p = pool(row);
    await assert.rejects(
      createPay54PostgresSessionResolver({
        pool: p, getTrustedServerTimeMs: () => 2000
      })(ctx),
      /TRUSTED_SESSION_UNAVAILABLE/
    );
    assert.equal(p.calls.at(-1).sql, "ROLLBACK");
    assert.equal(p.released, true);
  }
});
