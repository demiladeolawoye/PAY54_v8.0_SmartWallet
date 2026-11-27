# PAY54 Acceleration Wave 7 — Restricted Canonical Writer Positive Proof (Disposable Only)

27 November 2026. **Test-only grants; no deployable financial ACL or policy migration.**

## Technical implementation
`backend/db/tests/batch60/001_disposable_restricted_canonical_writer.sql` is a real PostgreSQL 16 end-to-end test of PAY54's original canonical `reserve_wallet_transfer`, `capture_reserved_wallet_transfer`, and `release_reserved_wallet_transfer`, running under a genuine **NOLOGIN / NOSUPERUSER / NOBYPASSRLS** owner using a transaction-scoped SECURITY DEFINER wrapper. An isolated application-caller role can invoke the attested wrapper only; it cannot directly call any of the canonical financial functions or read/write financial tables.

The wrapper derives the principal from the live `pay54.auth_sessions` row, matches token digest/account/session version and retains a `SELECT FOR UPDATE` lock through the enclosing transaction. It verifies personal account membership before invoking canonical financial primitives. Disposable fixture wallets and ledger accounts are funded using synthetic signed minor-unit entries. The test verifies first reserve, idempotent replay, capture to one balanced posted transfer, another reserve followed by release, denied wrong token and stale version, 4 outbox events, and account-level final balance 4,000/6,000. The **entire SQL transaction is rolled back** and post-rollback assertions require complete removal of all test roles, DDL, ACLs, policies and synthetic fixtures.

## Security limits
- The test installs fixture-scoped temporary RLS policies and grants **only inside disposable CI and only in a transaction that rolls back**. They are **not acceptable production ACLs**, even though the effective function owner is genuinely non-superuser and subject to FORCE RLS.
- The test proves a transaction-bound principal for this disposable wrapper and positive canonical procedure calls but does **not** prove two physical connections racing money posting and session revocation under the same writer; that is the next critical test.
- This is not an approved migration for managed staging. A production design requires audited grants, least-privilege `USING` and `WITH CHECK` policies, privilege escalation and search-path review, a non-forgeable session principal and service pool identity, negative cross-tenant/overspend concurrency, and independent DBA/Security approval.
- No protected-branch source merge, staging, spending, partner settlement or customer money is enabled.

## Acceptance
Source regression plus full disposable PostgreSQL 16 suite must pass on the exact head. Independent reviewer `milade2705` should examine the transaction role/DDL scope and rollback claims. A green disposable positive test is necessary technical evidence, not financial-release authority.

**Managed staging NO-GO · Production NO-GO · Customer money disabled · No cloud spending.**
