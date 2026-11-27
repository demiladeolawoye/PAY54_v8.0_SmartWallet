# PAY54 Acceleration Wave 8 — Physical Canonical Money-vs-Revocation Race

27 November 2026 · **DISPOSABLE PG16 ONLY · NO PAID CLOUD · NO CUSTOMER FUNDS**

## Delivered engineering test
`backend/db/tests/batch61/canonical_posting_revocation_race.py` uses **two separate PostgreSQL 16 processes/connections**, not a fake SQL invocation, to exercise the existing Wave7 restricted non-superuser SEC-DEF canonical wallet writer against the real `pay54.auth_sessions` row.

The test intentionally commits an isolated set of synthetic fixture roles, policies, wallets, initial funding journal and test session inside `pay54_disposable_ci`, so both connections can access the same physical rows. Connection A starts a transaction as the restricted financial application caller, invokes the session-attesting SEC-DEF wrapper and the **real** canonical reserve and capture SQL (one balanced ledger posting), and retains the session row lock. Connection B attempts to revoke the same session with version increment; the test independently inspects `pg_stat_activity` and requires a **real PostgreSQL lock wait**. It then commits A, allows B to complete the revocation, and confirms the previously valid token/session version is rejected on the next transaction. The test checks one actual posted canonical transfer and a revoked session.

Unlike Wave7's single `ROLLBACK` transaction, this physical race must commit fixture data to make it visible across connections. Accordingly, its finally block closes both connections and explicitly deletes every synthetic financial fixture, drops temporary test RLS policies and temporary roles, restores ledger immutability triggers and asserts cleanup. This is **not a deployable fixture or financial policy migration**. Existing Wave7 itself remains fully rollback-only.

## Architecture admission: production RLS/grants NOT yet ready
- Positive proof applies to **fixture-specific RLS grants/policies**, never real multi-tenant production authorisation. The Wave7 fixture's session policy uses a custom GUC for testing and does not constitute non-forgeable customer identity.
- The wrapper owner is genuinely NOLOGIN/NOSUPERUSER/NOBYPASSRLS, but owner privileges include broad SELECT and UPDATE on financial tables, and its disposable policies are fixture ID-scoped. Those permissions **must not** be promoted as-is.
- A production migration must replace hard-coded fixture policies with audited tenant/account/transaction-scoped `USING` and `WITH CHECK` rules, role membership policy, trigger and definer escape audit, outbox permissions, SQL plan/locking scrutiny, and verified forward/rollback under actual production-compatible roles.
- Any release candidate must be separately approved by Security, DBA and Release Manager, with a documented non-forgeable service identity and session assertion. Production money movement remains NO-GO.
- Physical race demonstrates one lock order. Additional reverse-order and cross-wallet/overspend concurrency, session rotation and provider dispute tests remain necessary.
- Cloud SQL quote/approval, partner certification, KYC/AML and source integration remain separate blockers.

## Release discipline
This Wave8 PR stays Draft and stacks on approved, unmerged Wave7. Existing full PG16 regression invokes the physical test after Wave7's positive one-transaction proof while FORCE RLS forward review is active, and before the reviewed rollback. Independent milade2705 review is required. **No protected branch merge, cloud resource, secret or customer-money activation.**
