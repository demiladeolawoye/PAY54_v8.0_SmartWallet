# PAY54 Acceleration Wave 4 — Wallet HTTP Integration / Financial Security Critical Path

26 November 2026. **No deployment, no financial DML activation, no source merge.**

## Delivered actual integration
`backend/src/wave2/wallet-http-listener.mjs` adapts the existing Wave 3 authenticated PostgreSQL wallet reader to real Node HTTP request/response primitives, without binding a production listener or mounting a route. Only an exact GET `/v1/wallets/read` with singular accountId, walletId and currency query fields, bounded request target and Authorization header reaches the underlying reader. The reader still verifies a SHA-256 digest derived from a canonical 32-byte bearer, requires a `REPEATABLE READ READ ONLY` transaction, exactly the `pay54_wallet_read_caller_role`, and a single match from the canonical RLS-protected database function. A wallet model only returns when explicitly read-only, transfer-disabled and structurally valid. Cache, referrer and content-type hardening headers are emitted; errors are generic.

`backend/tests/pay54-wave4-http-wallet-integration.test.mjs` runs an **actual ephemeral 127.0.0.1 HTTP server** and makes real HTTP requests through the adapter into the genuine reader and its parameterized SQL contract, backed by a deliberately controlled PostgreSQL driver fixture. It verifies exact minor-unit balance, role, transaction and connection lifecycle, rejects invalid verbs, duplicate query keys, unknown query keys, missing bearer, invalid currency, wrong DB role, empty result and database exception without exposing sensitive details. There are no external listeners, cloud services or customer credentials.

**Limitations:** The driver in this HTTP test is a fixture; the separate full disposable PostgreSQL 16 suite exercises the canonical SQL/RLS policies. Passing the two suites is not a real physical HTTP→live PostgreSQL integration acceptance test; managed service identities, router/session controls, transport TLS, trusted-proxy review, rate limiting and end-to-end UI UAT remain unverified. No production HTTP mount has been authorised.

## Financial core: technical admission remains P0
The financial `reserve_wallet_transfer`, `capture_reserved_wallet_transfer`, and `release_reserved_wallet_transfer` routines are currently SECURITY INVOKER without approved least-privilege writer grants. Existing FORCE RLS policy scopes are intended for restricted reads. A trusted principal cannot be inferred solely from user-supplied owner UUID or mutable request-supplied GUC. **Do not grant financial EXECUTE or blanket ledger table DML to pass a test.** A separate independently reviewed, transaction-bound identity architecture and migration/rollback must precede positive canonical reserve/capture/release tests under a non-superuser role.

## Controlled source integration
Compare the entire cumulative candidate against `project-titan` (previously 98 commits ahead and 79 changed files before Wave 4), review conflicts and duplicate workflow scope, request specific Security/DBA/QA evidence and separate source-only merge authorisation. Keep original approved draft PRs auditable. Green checks and review approval are necessary but insufficient for deployment.

## Outstanding change requests / reminders
- FIN-01: Trusted in-transaction authenticated principal, exact non-superuser RLS write policies and ACLs with rollback and physical revocation races.
- API-01: Production route, TLS/proxy hardening, rate limits, session lifecycle and log redaction review.
- UX-01: Dashboard/mobile integration and accessible end-to-end UAT.
- SRC-01: Controlled cumulative merge plan, independent release authorisation and all required CI.
- CLOUD-01: Final GBP quote for Cloud SQL storage, backups, networking and compute; no spending permission.
- RAILS-01: UK banking and Nigerian payout partner certification, KYC/AML, reconciliation and disputes.

**Staging NO-GO · Production NO-GO · Customer-money transactions disabled · No cloud spend.**
