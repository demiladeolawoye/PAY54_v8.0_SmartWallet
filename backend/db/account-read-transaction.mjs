"use strict";

/* PAY54 Batch 04 — per-operation read-only, transaction-scoped pool adapter.
 * Does not create a Pool or authenticate any database. It requires a trusted
 * server-verified principal and an independently provided statement allowlist.
 * Read-only transaction + statement-bound parameters enforce defense in depth;
 * no customer role is granted access by creating this module.
 */
import { requireTrustedPrincipal } from "../domain/trusted-account-principal.mjs";

export function createAccountReadTransaction({ pool, assertReadStatement }) {
  if (!pool || typeof pool.connect !== "function" ||
      typeof assertReadStatement !== "function") {
    throw new TypeError("Trusted pool and account read statement policy required");
  }

  return Object.freeze({
    async execute({ principal, sql, params }) {
      const principalId = requireTrustedPrincipal(principal);
      if (typeof sql !== "string" || !Array.isArray(params) || params.length > 3 ||
          params.some(x => typeof x !== "string")) {
        throw new TypeError("Validated account query and bounded parameters required");
      }
      assertReadStatement(sql, params, principalId);

      const client = await pool.connect();
      if (!client || typeof client.query !== "function" || typeof client.release !== "function") {
        throw new TypeError("Invalid database pool client");
      }
      let opened = false;
      let result;
      let failure = null;
      try {
        await client.query("BEGIN TRANSACTION ISOLATION LEVEL READ COMMITTED READ ONLY");
        opened = true;
        await client.query("SET LOCAL lock_timeout = '1000ms'");
        await client.query("SET LOCAL row_security = on");
        await client.query("SET LOCAL statement_timeout = '3000ms'");
        await client.query("SET LOCAL idle_in_transaction_session_timeout = '3000ms'");
        result = await client.query(sql, params);
        if (!result || !Array.isArray(result.rows) || result.rows.length > 100) {
          throw new Error("ACCOUNT_READ_UNAVAILABLE");
        }
        await client.query("COMMIT");
        opened = false;
      } catch (error) {
        failure = error;
        if (opened) {
          try { await client.query("ROLLBACK"); }
          catch { /* discard broken client */ }
        }
      } finally {
        // Error => discard uncertain session state. Otherwise release clean.
        client.release(failure !== null);
      }
      if (failure) throw failure;
      return Object.freeze({ rows: Object.freeze(result.rows.map(row =>
        Object.freeze({ ...row }))) });
    }
  });
}
