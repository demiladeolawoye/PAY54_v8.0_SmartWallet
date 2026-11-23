# PAY54 Batch 35 — Restricted Wallet Read: Disposable Execution Proof

## Baseline

Protected `project-titan` merge `21d2d9cec405aa39bb92387b8eec0a3d89c5af27` (PR #74).

## What is now verified by disposable PostgreSQL CI

The new SQL test `031_restricted_wallet_read_disposable.sql` uses Batch 34's separate `pay54_wallet_read_owner_role` and `pay54_wallet_read_caller_role`. During a transaction that is fully rolled back it temporarily grants the function owner read-only access to precisely enumerated tables, adds role-scoped row security policies, forces RLS on the ledger/reservation tables and creates a `SECURITY DEFINER` function. Only the disjoint caller role can execute the function; it has no direct table privileges.

The function obtains the principal from an active, unrevoked, unexpired database session bound to the exact 256-bit token digest, rather than a caller-provided actor UUID. It verifies that a PERSONAL account is verified, active, legally owned and associated with an active PERSONAL_OWNER membership; the specified wallet must be explicitly bound and active. Ledger entries are constrained by a single customer-liability ledger account, matching currency and posted journal status, while reservations include all remaining HELD rows. RLS policies also bind the session and account/wallet context.

The test switches to the restricted caller and verifies denied direct sessions/ledger/reservation SELECT, successful zero-value posted/held aggregates for one authenticated synthetic account, and zero results for a wrong wallet. No fixture, policy, financial privilege or callable function persists when the transaction rolls back.

## Architectural limitations and release gate

This is an **isolated database proof, not a persistent migration**. The test transaction contains fixture DML, so it uses REPEATABLE READ but cannot enter READ ONLY mode; production use must be independently restricted to READ ONLY. Real authenticated client identity, physical login-to-role assumption, TLS, secret custody, actual session revocation racing with an in-flight query, HTTP transport, rate limits and operational cancellation remain unverified. The test uses a disposable PostgreSQL superuser only to set up temporary roles/policies/fixtures and never grants a lasting financial SELECT privilege.

The function returns `posted_minor` and `held_minor` **accounting amounts**. It is **not a customer-available balance**. It is never mounted to a customer-facing endpoint, and the existing Batch 31 `availableMinor` contract remains unchanged. Negative ledger positions, funded holds/captures, settlement, reversals, disputes and cross-provider reconciliation require separate approved acceptance.

The SQL proof must never be copied into persistent staging or production or applied as a database migration. A real restricted execution architecture requires another separately reviewed migration, immutable audit trail and rollback plan, and dedicated limited-authentication database login. The source-only PR can be merged after exact-commit CI and independent security approval.

**Production and persistent staging NO-GO.**
