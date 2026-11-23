# PAY54 Batch 34 — Restricted Wallet-Read Authority & Financial Integrity

## Protected baseline and scope

PR #73 merged to `project-titan` at `3a7eb64d626094c138c39227a2e04f2b57db1b2d`. Batch 34 is an **additive, SOURCE-ONLY and disposable-test-only** consolidated package.

### 1. Dedicated minimum-privilege PostgreSQL execution authority

`backend/db/migrations/029_wallet_read_inert_role_foundation.sql` introduces `pay54_wallet_read_owner_role` and `pay54_wallet_read_caller_role`, both NOLOGIN, NOINHERIT, NOSUPERUSER and NOBYPASSRLS, with no memberships, no direct financial SELECT or DML grants, and no login credentials. They cannot call financial posting procedures. A separate `pay54.wallet_read_authority_status()` SECURITY DEFINER function always returns `read_enabled=false`; there is **no EXECUTE grant** to the caller. The migration is deliberately not a production wallet-balance reader. SQL integration exercises the actual restricted role, confirms denied sessions and ledger SELECT, and proves effective role reset on rollback.

### 2. Forced RLS and account isolation

The migration preflight reasserts FORCE ROW LEVEL SECURITY on the existing canonical session, account, membership and personal-wallet binding tables. The migration does NOT enable new permissive financial-ledger RLS policies, nor falsely claim the new owner can securely read customer ledger records. Genuine restricted financial-data access requires a separate reviewed RLS policy and function-owner architecture. No current customer permission is broadened.

### 3. Funded wallet, reservation, capture, release and reversal

Disposable PostgreSQL CI reruns existing canonical acceptance tests for synthetic funding, reserved amounts, idempotency, actual double-entry capture, one-time journal posting, explicit hold release and immutable reversal. Those tests were already tracked in the project; this PR deliberately reuses them rather than duplicating financial business logic. This is **synthetic test funding** only, not provider settlement or real money. Posted minus HELD remains a derived accounting figure rather than approved spendable funds.

### 4. Genuine concurrency and revocation

The package reruns `007_capture_release_concurrency.sh` against the disposable PostgreSQL service, with two independent PostgreSQL connections blocked on an actual operation row lock. It validates capture/release, capture/capture and release/release outcomes, journal idempotency and final accounting. Existing Batch 32/33 tests continue to reject revoked sessions and suspended memberships for subsequent reads. A fully atomic race between PostgreSQL authorization and mid-flight session revocation under a real restricted wallet-reader function is **not yet proven**.

### 5. API-to-database safeguarding

The source-only `backend/db/wallet-read-transaction-attestor.mjs` uses an injected physical database connection to enter `REPEATABLE READ READ ONLY`, attest current role versus login role, and confirm forbidden ledger and reservation SELECT and forbidden function invocation. It always rolls back and discards the connection, including on errors. The current tests mock that physical connection and do not prove actual managed PostgreSQL TLS, identity or secret custody. The existing Batch 31/32 unmounted HTTP API and frontend wallet presenter remain unchanged; no new route is exposed.

### 6. Mobile and accessibility acceptance; rollback

Existing protected dashboard, wallet presenter and browser regression workflows are rerun. Device lab acceptance, keyboard/screen reader results, responsive mobile view verification, legitimate server-backed balances, and live API account switching **remain outstanding** and cannot be claimed from CI mocks.

Rollback for this package is **source-only revert**, with independent review of any revert commit. A disposable database is discarded after tests. Migration 029 creates cluster-scoped roles and must not be applied to staging or production. There is no automated persistent-database downgrade because no persistent deployment is authorized. Any future staging execution requires an approved migration/rollback plan, named owner, immutable audit evidence and separate release ticket.

## Outstanding critical blockers

- Restricted SECURITY DEFINER balance read function and owner-scoped RLS for financial records, tested under a real NOLOGIN delegated role.
- Real, independently authenticated PostgreSQL workload identity and TLS, read-only transaction provenance, cancellation and mid-flight revocation behavior.
- Approved available-balance semantics including authorization holds, reversal timing, disputes, settlement status and amount provenance.
- Backend-to-dashboard API wiring with approved session handling and mobile/accessibility acceptance.
- Contracted UK–Nigeria regulated payment providers, safeguarding, operational monitoring, incident response, Pages containment and deployment controls.

**Release gate: SOURCE-ONLY review. Persistent staging and production remain NO-GO. No live balances or real-money execution.**
