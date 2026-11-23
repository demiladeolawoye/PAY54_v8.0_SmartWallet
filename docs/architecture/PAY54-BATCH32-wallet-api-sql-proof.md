# PAY54 Batch 32 — HTTP Admission & Disposable PostgreSQL Wallet Ledger Proof

## Baseline
PR #71 was merged to protected `project-titan` at `bc371ee26137dd908e8d669672fed754beea1ec5`.

## Implemented, source-only
1. An unmounted, strict HTTPS-origin `GET /v1/accounts/{accountId}/wallet/balance` handler rejects invalid method/path, cookie fallback, forged Origin/Host, cross-site Fetch Metadata, duplicate critical headers and ambiguous body framing. It delegates credential authentication and account ownership to the already reviewed Batch 31 service. No CORS grant or public listener is created. Actual Node loopback HTTP tests prove accepted response framing, denial and generic no-store failures.
2. A parameterised PostgreSQL `PREPARE` query binds the token digest, account UUID, wallet UUID and currency. It joins canonical `auth_sessions`, `account_contexts`, `account_memberships`, `personal_wallet_bindings`, `wallets`, `ledger_accounts`, `ledger_entries` and `ledger_journals`. Only active, non-expired sessions belonging to a verified personal-account owner with active wallet binding qualify. Draft journals are excluded from posted-net aggregation.
3. Disposable PostgreSQL 16 tests execute the query against actual canonical schema migrations, proving zero posted net, non-matching account denial, unknown session digest denial, suspended membership denial, immediate subsequent revocation denial, the existing reader role's continued SELECT denial and rollback of all temporary fixtures.
4. Existing protected CI adds Node HTTP integration and the real PostgreSQL execution proof without applying migrations to a persistent database.

## Critical design limitations and next implementation requirements

The SQL query returns `posted_net_minor` and `posted_entry_count` for **ledger accounting evidence**, not a customer-available balance. Negative customer-liability ledger direction, reservations, pending transfers, reversals, settlement proof and currency-specific semantics have not been approved here. The query MUST NOT be connected to the Batch 31 `availableMinor` or a live dashboard, and the SQL file MUST NOT be shipped as an independently privileged production reader.

**The PostgreSQL integration test uses a disposable CI superuser.** This proves query semantics and canonical ACL denial, not restricted runtime execution under an independently approved database login. No SECURITY DEFINER, app SELECT grant, new RLS policy, public API, staging role or permanent migration is added. The application-facing handler remains unmounted; its injected service requires separate real login/session-resolution, CSRF/session security and a verified private TLS/PostgreSQL connection. Real mobile screen acceptance is not yet demonstrated: existing dashboard browser/screenshots and client isolation regressions run, but no customer backend data is exposed.

Before any staging:
- Approve managed PostgreSQL authentication, dedicated read role and least-privilege execution design with independently reviewed RLS.
- Bind server-validated bearer-session digest to the private query, reject non-active memberships and guarantee revocation after in-flight reads.
- Establish ledger balance business semantics (posted, held, available and currency exponent), with reconciled source provenance, then update API response contract deliberately.
- Verify actual network TLS, credential custody/rotation, rate limits, request deadlines, host/proxy security and API observability in a controlled staging change.
- Run mobile and desktop customer acceptance, keyboard/screen-reader and account-switch tests using genuine authorised staging identities.

**Security decision: source-only and disposable-testing only. Persistent staging and production NO-GO.**
