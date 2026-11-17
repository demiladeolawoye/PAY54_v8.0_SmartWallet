"use strict";

/**
 * PAY54 Batch 22 / 819 — executable PostgreSQL read-only directory adapter.
 *
 * Accepts a real node-postgres-compatible pool, supplied only by trusted
 * backend bootstrap. No database is created, migrations are not run, and
 * no HTTP account endpoint is enabled by importing this module.
 *
 * Runtime role must be non-owner/NOBYPASSRLS and have SELECT only on
 * pay54.accounts and pay54.account_memberships. SQL RLS is the enforcement
 * boundary, not the rlsEnforced metadata in the transaction callback.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DENIED = "PAY54_PG_SCOPED_READ_UNAVAILABLE";
const ACCOUNTS = `SELECT account_id::text AS "accountId",
  legal_owner_id::text AS "legalOwnerId",
  account_type AS "type", display_name AS "displayName",
  account_status AS "status", verification_status AS "verificationStatus"
  FROM pay54.accounts ORDER BY account_id LIMIT 1001`;
const MEMBERS = `SELECT account_id::text AS "accountId",
  principal_id::text AS "principalId",
  member_role AS "role", member_status AS "status"
  FROM pay54.account_memberships
  WHERE principal_id = $1::uuid ORDER BY account_id LIMIT 1001`;
const deny = () => { throw new Error(DENIED); };

export function createPay54PostgresReadTransaction({ pool } = {}) {
  if (!pool || typeof pool.connect !== "function") deny();

  return async function withScopedReadTransaction(principalId, task) {
    if (typeof principalId !== "string" || !UUID.test(principalId) ||
        typeof task !== "function") deny();

    const actor = principalId.toLowerCase();
    let client, started = false, disposable = false;
    try {
      client = await pool.connect();
      if (!client || typeof client.query !== "function" ||
          typeof client.release !== "function") deny();
      // Restricted, consistent snapshot. No financial DML is permitted.
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      started = true;
      await client.query(
        "SELECT set_config('pay54.actor_id', $1::text, true)",
        [actor]
      );
      // Verify the database transaction-local identity before any reads.
      const bound = await client.query(
        "SELECT current_setting('pay54.actor_id', true) AS actor_id"
      );
      if (bound?.rows?.length !== 1 || bound.rows[0]?.actor_id !== actor) deny();

      const transaction = Object.freeze({
        actorId: actor,
        readOnly: true,
        rlsEnforced: true,
        listAccounts: async () => {
          const result = await client.query(ACCOUNTS);
          if (!Array.isArray(result?.rows)) deny();
          return result.rows;
        },
        listMemberships: async () => {
          const result = await client.query(MEMBERS, [actor]);
          if (!Array.isArray(result?.rows)) deny();
          return result.rows;
        }
      });

      const result = await task(transaction);
      await client.query("COMMIT");
      started = false;
      return result;
    } catch {
      if (client && started) {
        try { await client.query("ROLLBACK"); } catch { disposable = true; }
      }
      deny();
    } finally {
      if (client) {
        try { client.release(disposable); } catch { /* connection returned by driver */ }
      }
    }
  };
}

export const PAY54_PG_DIRECTORY_SQL = Object.freeze({ ACCOUNTS, MEMBERS });
