"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { createPay54PostgresSessionRotation as createRotation }
  from "../src/postgres-session-rotation.mjs";

const actor = "11111111-1111-4111-8111-111111111111";
const oldAccount = "11111111-1111-4111-8111-111111111111";
const business = "33333333-3333-4333-8333-333333333333";
const token = randomBytes(32).toString("base64url");
const csrf = randomBytes(32).toString("base64url");
const requestContext = {
  headers: {
    authorization: "Bearer " + token,
    "x-pay54-csrf": csrf,
    origin: "https://wallet.example"
  }
};
const session = {
  sessionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  principalId: actor, activeAccountId: oldAccount, status: "ACTIVE",
  version: 5, issuedAtMs: 1000, expiresAtMs: 600000
};
const requestPayload = { requestedAccountId: business };

function fixture({ wrongRole = false, failAt = "", returnBadVersion = false } = {}) {
  const calls = [];
  const releases = [];
  const pool = {
    async connect() {
      return {
        async query(sql, params) {
          calls.push({ sql, params });
          if (sql === failAt) throw Error("PRIVATE_DB_CONNECTION_DETAILS");
          if (sql.startsWith("SELECT current_user AS role_name")) {
            return { rows: [{
              role_name: wrongRole ? "postgres" : "pay54_session_rotate_role",
              restricted: !wrongRole, may_rotate: true, may_write_ledger: false
            }] };
          }
          if (sql.includes("FROM pay54.rotate_account_context_session")) {
            return { rows: [{
              sessionId: params[2],
              version: String(returnBadVersion ? 99 : 6)
            }] };
          }
          return { rows: [] };
        },
        release(discard = false) { releases.push(discard); }
      };
    }
  };
  return { pool, calls, releases };
}

function service(fx, options = {}) {
  return createRotation({
    writePool: fx.pool,
    resolveAuthenticatedSession: async () => ({ ...session }),
    trustedApplicationOrigin: "https://wallet.example",
    getTrustedServerTimeMs: () => 2000,
    ...options
  });
}

test("875: committed rotation returns fresh random secrets only after database COMMIT", async () => {
  const fx = fixture();
  const result = await service(fx)({ requestContext, requestPayload });
  assert.equal(result.requestedAccountId, business);
  assert.equal(result.sessionVersion, 6);
  assert.equal(result.paymentAuthorised, false);
  assert.equal(result.productionHttpRouteActivated, false);
  assert.equal(result.expiresAtMs, session.expiresAtMs);
  assert.ok(Object.isFrozen(result));
  assert.notEqual(result.bearerToken, token);
  assert.notEqual(result.csrfToken, csrf);
  const rotation = fx.calls.find(x => x.sql.includes("FROM pay54.rotate_account_context_session"));
  assert.ok(rotation);
  assert.deepEqual(rotation.params[0], createHash("sha256").update(Buffer.from(token,"base64url")).digest());
  assert.deepEqual(rotation.params[1], createHash("sha256").update(Buffer.from(csrf,"base64url")).digest());
  assert.deepEqual(rotation.params[3], createHash("sha256")
    .update(Buffer.from(result.bearerToken,"base64url")).digest());
  assert.deepEqual(rotation.params[4], createHash("sha256")
    .update(Buffer.from(result.csrfToken,"base64url")).digest());
  assert.equal(fx.calls.at(-1).sql, "COMMIT");
  assert.deepEqual(fx.releases, [false]);
  assert.equal(JSON.stringify(fx.calls).includes(token), false);
  assert.equal(JSON.stringify(fx.calls).includes(csrf), false);
});

test("875: role mismatch and unexpected SQL result deny without issuing a token", async () => {
  for (const variant of [{ wrongRole: true }, { returnBadVersion: true }]) {
    const fx = fixture(variant);
    await assert.rejects(service(fx)({ requestContext, requestPayload }),
      /ACCOUNT_ROTATION_UNAVAILABLE/);
    assert.equal(fx.calls.at(-1).sql, "ROLLBACK");
    assert.equal(fx.calls.some(x => x.sql === "COMMIT"), false);
    assert.deepEqual(fx.releases, [false]);
  }
});

test("875: uncertain commit discards connection and releases no fresh credentials", async () => {
  const fx = fixture({ failAt: "COMMIT" });
  await assert.rejects(service(fx)({ requestContext, requestPayload }), err => {
    assert.equal(err.message, "PAY54_ACCOUNT_ROTATION_UNAVAILABLE");
    assert.equal(err.message.includes("PRIVATE_DB"), false);
    return true;
  });
  assert.equal(fx.calls.some(x => x.sql === "COMMIT"), true);
  assert.equal(fx.calls.at(-1).sql, "ROLLBACK");
  assert.deepEqual(fx.releases, [true]);
});

test("875: untrusted origin, malformed CSRF, revoked session and forged actor fail before SQL", async () => {
  const cases = [
    { ctx: { ...requestContext, headers: { ...requestContext.headers, origin: "https://evil.example" } } },
    { ctx: { ...requestContext, headers: { ...requestContext.headers, "x-pay54-csrf": "small" } } },
    { payload: { requestedAccountId: business, role: "BUSINESS_OWNER" } },
    { original: { ...session, status: "REVOKED" } },
    { original: { ...session, activeAccountId: business } },
    { original: { ...session, expiresAtMs: 2000 } }
  ];
  for (const item of cases) {
    const fx = fixture();
    await assert.rejects(
      service(fx, item.original
        ? { resolveAuthenticatedSession: async () => item.original } : {})({
        requestContext: item.ctx ?? requestContext,
        requestPayload: item.payload ?? requestPayload
      })
    );
    assert.equal(fx.calls.length, 0);
  }
});
