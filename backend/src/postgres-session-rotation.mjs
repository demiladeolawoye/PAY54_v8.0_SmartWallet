"use strict";

/**
 * PAY54 Batch 23 / 873 — server-only PostgreSQL session rotation adapter.
 *
 * Requires a separately provisioned trusted session resolver and dedicated
 * pay54_session_rotate_role pool. Does not register any HTTP routes.
 * Client payload supplies ONLY the requested account; principal, session
 * version and expiry come from a trusted session lookup and SQL row locks.
 *
 * A newly generated token is returned ONLY after COMMIT succeeds. If COMMIT
 * is uncertain, both generated secrets are abandoned and the connection is
 * discarded, requiring reauthentication/recovery through a separate service.
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { extractPay54BearerCredential, digestPay54BearerToken }
  from "./postgres-session-resolver.mjs";
import { validatePay54AccountReadSession }
  from "../domain/account-read-session.mjs";
import { parsePay54AccountSwitchRequest }
  from "../domain/account-switch-request.mjs";

const CSRF = /^[A-Za-z0-9_-]{43}$/;
const deny = () => { throw new Error("PAY54_ACCOUNT_ROTATION_UNAVAILABLE"); };
const digest = raw => createHash("sha256").update(raw).digest();

const ROLE_SQL = `SELECT current_user AS role_name,
 (SELECT NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls
   FROM pg_roles WHERE rolname=current_user) AS restricted,
 has_function_privilege(current_user,
  'pay54.rotate_account_context_session(bytea,bytea,uuid,bytea,bytea,uuid,bigint,uuid,uuid,timestamptz)',
  'EXECUTE') AS may_rotate,
 has_table_privilege(current_user,'pay54.ledger_entries','INSERT,UPDATE,DELETE')
   AS may_write_ledger`;

const ROTATE_SQL = `SELECT rotated_session_id::text AS "sessionId",
 rotated_session_version::text AS "version"
 FROM pay54.rotate_account_context_session(
  $1::bytea,$2::bytea,$3::uuid,$4::bytea,$5::bytea,
  $6::uuid,$7::bigint,$8::uuid,$9::uuid,$10::timestamptz
 )`;

function verifyOrigin(configured, presented) {
  if (typeof configured !== "string" || typeof presented !== "string") deny();
  let parsed;
  try { parsed = new URL(configured); } catch { deny(); }
  if (parsed.protocol !== "https:" || parsed.origin !== configured ||
      presented !== configured) deny();
}

function csrfFromRequest(ctx) {
  const value = ctx?.headers?.["x-pay54-csrf"];
  if (typeof value !== "string" || !CSRF.test(value)) deny();
  const raw = Buffer.from(value, "base64url");
  if (raw.length !== 32 || raw.toString("base64url") !== value) deny();
  return raw;
}

export function createPay54PostgresSessionRotation({
  writePool,
  resolveAuthenticatedSession,
  trustedApplicationOrigin,
  getTrustedServerTimeMs = Date.now
} = {}) {
  if (!writePool || typeof writePool.connect !== "function" ||
      typeof resolveAuthenticatedSession !== "function" ||
      typeof getTrustedServerTimeMs !== "function") deny();
  verifyOrigin(trustedApplicationOrigin, trustedApplicationOrigin);

  return async function rotateSession({ requestContext, requestPayload } = {}) {
    const target = parsePay54AccountSwitchRequest(requestPayload);
    verifyOrigin(trustedApplicationOrigin, requestContext?.headers?.origin);
    const existingToken = extractPay54BearerCredential(requestContext);
    const existingCsrf = csrfFromRequest(requestContext);
    let session, now;
    try {
      now = getTrustedServerTimeMs();
      session = validatePay54AccountReadSession({
        sessionFromTrustedAuthority:
          await resolveAuthenticatedSession(requestContext),
        serverTimeMs: now
      });
    } catch { deny(); }

    const original = await resolveAuthenticatedSession(requestContext).catch(() => deny());
    if (original.sessionId.toLowerCase() !== session.sessionId ||
        original.version !== session.sessionVersion ||
        original.activeAccountId == null ||
        original.activeAccountId.toLowerCase() === target.requestedAccountId ||
        original.principalId.toLowerCase() !== session.principalId ||
        session.sessionVersion >= Number.MAX_SAFE_INTEGER ||
        session.sessionVersion < 1 ||
        session.sessionId === target.requestedAccountId ||
        session.sessionVersion === undefined ||
        session.principalId === target.requestedAccountId ||
        now + 5_000 >= original.expiresAtMs) deny();

    // Credential is generated locally and never included in logs or SQL text.
    const rawNewToken = randomBytes(32);
    const rawNewCsrf = randomBytes(32);
    const newSessionId = randomUUID();
    const auditId = randomUUID();
    const correlationId = randomUUID();
    const nextExpiryMs = Math.min(original.expiresAtMs, now + 30 * 60 * 1000);
    let client, started = false, discard = false;

    try {
      client = await writePool.connect();
      if (!client || typeof client.query !== "function" ||
          typeof client.release !== "function") deny();
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE");
      started = true;
      await client.query("SET LOCAL lock_timeout = '3s'");
      await client.query("SET LOCAL statement_timeout = '8s'");
      const role = await client.query(ROLE_SQL);
      const posture = role?.rows?.[0];
      if (role?.rows?.length !== 1 ||
          posture.role_name !== "pay54_session_rotate_role" ||
          posture.restricted !== true ||
          posture.may_rotate !== true ||
          posture.may_write_ledger !== false) deny();

      const values = [
        Buffer.from(digestPay54BearerToken(existingToken), "hex"),
        digest(existingCsrf),
        newSessionId,
        digest(rawNewToken),
        digest(rawNewCsrf),
        target.requestedAccountId,
        session.sessionVersion,
        correlationId,
        auditId,
        new Date(nextExpiryMs)
      ];
      const result = await client.query(ROTATE_SQL, values);
      if (result?.rows?.length !== 1 ||
          result.rows[0].sessionId?.toLowerCase() !== newSessionId ||
          Number(result.rows[0].version) !== session.sessionVersion + 1) deny();

      // No response containing the new token is allowed until COMMIT succeeds.
      await client.query("COMMIT");
      started = false;
      return Object.freeze({
        schema: "pay54.account-session-rotation-committed.v1",
        sessionId: newSessionId,
        requestedAccountId: target.requestedAccountId,
        sessionVersion: session.sessionVersion + 1,
        bearerToken: rawNewToken.toString("base64url"),
        csrfToken: rawNewCsrf.toString("base64url"),
        expiresAtMs: nextExpiryMs,
        paymentAuthorised: false,
        productionHttpRouteActivated: false
      });
    } catch {
      if (client && started) {
        try { await client.query("ROLLBACK"); } catch { discard = true; }
      }
      deny();
    } finally {
      if (client) {
        try { client.release(discard); } catch { /* discarded on driver failure */ }
      }
      rawNewToken.fill(0);
      rawNewCsrf.fill(0);
      existingCsrf.fill(0);
    }
  };
}

export const PAY54_ROTATION_SQL = Object.freeze({ ROLE_SQL, ROTATE_SQL });
