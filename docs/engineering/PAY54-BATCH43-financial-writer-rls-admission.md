# PAY54 Batch 43 — Financial Writer / Forced-RLS Impact Gate

24 November 2026. SOURCE ONLY. Target protected branch: `project-titan`.

## Actual reviewed source
This gate inspects the existing Batch38 wallet-read forward and rollback candidates. The forward candidate enables and **FORCES** PostgreSQL RLS on: `pay54.wallets`, `pay54.ledger_accounts`, `pay54.ledger_entries`, `pay54.ledger_journals`, and `pay54.balance_reservations`. The new policies visible on those financial relations are SELECT-only for the restricted reader. That **may break existing financial writers, SECURITY DEFINER operations and triggers**, depending on their real effective role and policy path. It is not safe to infer compatibility from SQL run as a database superuser.

## Delivered
A deterministic offline Node module, tests and CI validate visible source transitions, missing INSERT/UPDATE/DELETE policy evidence, reader function and rollback statements. Even an apparently complete source cannot change the NO-GO status: actual role permissions, triggers, effective identities, real writer transactions and DBA/security signoff are not demonstrated by regex parsing.

## Mandatory disposable PG16 admission before a persistent migration
1. Establish baseline using exact non-superuser financial writer role/session and real trigger/function owners. Run the existing reservation, capture/release, expiry, reversal, idempotency, outbox and concurrent double-spend tests.
2. Apply Batch38 forward SQL to an isolated PostgreSQL 16 instance with synthetic data only. Re-run the same financial tests under identical *effective writer* identities. Fail closed on any permission denial or balance/outbox divergence.
3. Verify the new function-only reader has no direct financial-table access, enforce cross-account RLS, confirm non-login roles, and prohibit PUBLIC EXECUTE.
4. Roll back the forward migration. Verify the prior financial RLS/ACL states and all core writer/ledger tests remain correct, without unexpected grants or leftover policies/functions.
5. Require independent DBA and Security approval, cloud IAM/TLS/secret custody, final actual GBP quote, finite authorised spend and rollback ownership before staging.

Do **not** create broad permissive writer policies as a shortcut; any writer-compatible policy or changed ownership must be separately risk reviewed. Source-only green tests are **not** evidence of managed database compatibility.

Staging **NO-GO**. Production **NO-GO**. No cloud spend, persistent migration, money movement, deployment or permission grant authorised.
