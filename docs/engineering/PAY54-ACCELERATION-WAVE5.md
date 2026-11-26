# PAY54 Acceleration Wave 5 — Wallet Dashboard Read Model and Canonical Writer Blocker

26 November 2026 · SOURCE ONLY · NO DEPLOY · NO MONEY EXECUTION

## Delivered
- `backend/src/wave2/wallet-dashboard-controller.mjs` now implements a real JavaScript dashboard consumer of the Wave4 authenticated `GET /v1/wallets/read` contract. It validates wallet/account/currency identifiers and the returned authoritative read model, uses exact signed-64-bit minor-unit BigInt arithmetic, enforces posted-minus-held available balance, and renders text safely through `textContent` rather than interpolated HTML. The transfer control is always disabled. Invalid, cross-wallet, inconsistent or stale responses cannot display a trusted balance; failed requests clear the previous balance. Credentials are obtained through an injected provider and are never stored.
- `backend/tests/pay54-wave5-wallet-dashboard.test.mjs` exercises positive read-only rendering, disabled transfers, unknown/error responses, invalid money, stale asynchronous responses and exact int64 formatting.
- `backend/db/tests/batch58/001_canonical_transaction_identity_blocker.sql` inspects the REAL PostgreSQL 16 canonical financial procedure catalogue after FORCE RLS forward review. It verifies the existing three SECURITY INVOKER money functions are currently not directly transaction-bound to `pay54.auth_sessions`, that the restricted financial executor remains denied EXECUTE and DML, and that new or changed identity implementation requires explicit security review. The SQL performs only READ ONLY catalogue checks and never executes a financial transaction.

## Architectural limitations and security gate
This dashboard consumer is a testable, reusable adapter, **not** a production dashboard module mount. Future integration must bind it to the actual PAY54 dashboard router using verified API session handling, accessibility and end-to-end backend tests. The account identity is supplied by a trusted host; client-supplied identifiers are never independently authoritative for server access.

The canonical financial-writer blocker is deliberately preserved. A future independently reviewed design must bind an authenticated session token digest, principal identity, account membership and revocation lock within the same database transaction and grant precisely audited FORCE-RLS-safe permissions. No direct grants, temporary bypass, hard-coded synthetic owner policies, production financial DML or migrations to real customer databases are part of this batch. Positive canonical reserve/capture/release remains P0 **NOT IMPLEMENTED**.

## Integration / release requirements
PR #100 approved in GitHub but remains Draft and unmerged. This Wave5 branch stacks on its exact reviewed commit. Source-level CI and all disposable PG16 ledger/session/finance concurrency regressions must pass on the final Wave5 SHA, followed by independent review. A separately authorised cumulative merge remains outstanding. Cloud SQL GBP pricing, IAM, TLS, operational rollback, UK–Nigeria provider contracts, AML and settlement remain gating milestones.

**No cloud spend, no deployment, no financial execution. Staging NO-GO. Production NO-GO.**
