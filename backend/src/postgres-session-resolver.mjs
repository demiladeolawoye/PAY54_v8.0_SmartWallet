"use strict";
import { assertPay54PostgresReadRole } from "./postgres-rls-posture.mjs";

/**
 * PAY54 Batch 22 / 822 — trusted PostgreSQL session reader.
 *
 * Credential source: a strict 256-bit bearer token supplied to this server.
 * A client-provided principal, account or role is never trusted. The hashed
 * credential is bound transaction-locally to a forced-RLS session table.
 *
 * Requires an independently provisioned NOBYPASSRLS SELECT-only auth role.
 * Not mounted to HTTP; does not create/renew/revoke a customer session.
 */
import { createHash } from "node:crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{43}$/;
const deny = () => { throw new Error("PAY54_TRUSTED_SESSION_UNAVAILABLE"); };

export function digestPay54BearerToken(token) {
  if (typeof token !== "string" || !TOKEN.test(token)) deny();
  const raw = Buffer.from(token, "base64url");
  if (raw.length !== 32 || raw.toString("base64url") !== token) deny();
  return createHash("sha256").update(raw).digest("hex");
}

export function extractPay54BearerCredential(requestContext) {
  const header = requestContext?.headers?.authorization;
  if (typeof header !== "string" || !header.startsWith("Bearer ") ||
      header.length !== 50 || header.slice(7).includes(" ")) deny();
  const credential = header.slice(7);
  digestPay54BearerToken(credential);
  return credential;
}

const SESSION_SQL = `SELECT session_id::text AS "sessionId",
 principal_id::text AS "principalId",
 active_account_id::text AS "activeAccountId",
 session_status AS "status", session_version::text AS "version",
 (round(extract(epoch from issued_at) * 1000))::bigint::text AS "issuedAtMs",
 (round(extract(epoch from expires_at) * 1000))::bigint::text AS "expiresAtMs"
 FROM pay54.auth_sessions
 WHERE token_digest = decode($1::text, 'hex') LIMIT 2`;

export function createPay54PostgresSessionResolver({ pool, getTrustedServerTimeMs = Date.now } = {}) {
  if (!pool || typeof pool.connect !== "function" ||
      typeof getTrustedServerTimeMs !== "function") deny();

  return async function resolveAuthenticatedSession(requestContext) {
    const token = extractPay54BearerCredential(requestContext);
    const digest = digestPay54BearerToken(token);
    let client, started = false, disposable = false;
    try {
      client = await pool.connect();
      if (!client || typeof client.query !== "function" ||
          typeof client.release !== "function") deny();
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      started = true;
      await assertPay54PostgresReadRole({
        client, tables: ["auth_sessions"]
      });
      await client.query(
        "SELECT set_config('pay54.session_digest', $1::text, true)",
        [digest]
      );
      const verified = await client.query(
        "SELECT current_setting('pay54.session_digest', true) AS digest"
      );
      if (verified?.rows?.length !== 1 || verified.rows[0]?.digest !== digest) deny();
      const result = await client.query(SESSION_SQL, [digest]);
      if (result?.rows?.length !== 1) deny();
      const row = result.rows[0];
      const version = Number(row.version);
      const issuedAtMs = Number(row.issuedAtMs);
      const expiresAtMs = Number(row.expiresAtMs);
      const now = getTrustedServerTimeMs();
      if (!UUID.test(row.sessionId ?? "") ||
          !UUID.test(row.principalId ?? "") ||
          (row.activeAccountId != null && !UUID.test(row.activeAccountId)) ||
          row.status !== "ACTIVE" ||
          !Number.isSafeInteger(version) || version < 1 ||
          !Number.isSafeInteger(now) ||
          !Number.isSafeInteger(issuedAtMs) ||
          !Number.isSafeInteger(expiresAtMs) ||
          issuedAtMs > now || expiresAtMs <= now) deny();
      await client.query("COMMIT");
      started = false;
      return Object.freeze({
        sessionId: row.sessionId.toLowerCase(),
        principalId: row.principalId.toLowerCase(),
        activeAccountId: row.activeAccountId?.toLowerCase() ?? null,
        status: "ACTIVE",
        version, issuedAtMs, expiresAtMs
      });
    } catch {
      if (client && started) {
        try { await client.query("ROLLBACK"); } catch { disposable = true; }
      }
      deny();
    } finally {
      if (client) {
        try { client.release(disposable); } catch { /* driver already disposed */ }
      }
    }
  };
}
