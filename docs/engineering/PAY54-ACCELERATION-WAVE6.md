# PAY54 Acceleration Wave 6 — Canonical Session-Locked Financial Identity Proof

26 November 2026 · **Disposable PostgreSQL 16 only. Financial execution remains disabled.**

## Engineering implementation

The executable SQL regression `backend/db/tests/batch59/001_canonical_session_locked_identity.sql` uses PAY54's **actual canonical** `pay54.auth_sessions`, `pay54.account_contexts` and `pay54.account_memberships` tables in the existing disposable PostgreSQL CI database. It creates one disposable verified personal account and session, declares a transaction-local SECURITY INVOKER function and validates token digest, active session, version, principal and active account membership.

The function locks the actual `auth_sessions` row using `SELECT ... FOR UPDATE OF s` in the caller's transaction. This demonstrates a concrete version-aware, transaction-bound principal resolution path on the canonical *identity* schema, not a synthetic session schema. Negative tests reject the wrong token, wrong account, stale version and revoked session. The transaction rolls back all fixtures and function definition; a post-rollback check proves the test account and session are absent.

The source regression confirms there are no financial table writes, canonical transfer calls, financial grants, role elevations or committed fixtures. The existing full disposable PostgreSQL 16 test workflow runs Wave 6 after the reviewed wallet-reader FORCE-RLS forward migration and before rollback.

## Critical security limitations

1. The test uses the disposable CI fixture installer identity `postgres`, NOT a production least-privilege financial executor. It deliberately does not grant UPDATE/SELECT FOR UPDATE privileges to `pay54_ledger_executor_role`. A genuine restricted writer and RLS policy remain **unimplemented**.
2. The transaction-local function validates session ownership and holds a session row lock, but it does not call `reserve_wallet_transfer`, `capture_reserved_wallet_transfer` or `release_reserved_wallet_transfer`. The authenticated session and canonical financial posting are **not yet a proven single atomic transaction**.
3. This SQL case exercises a single connection plus post-revocation revalidation. Existing Batch49/55 tests supply physical concurrency evidence in separate cases; a true canonical money-versus-revocation race remains outstanding.
4. Production RLS, grant graphs, service pool identities, API integration, settlement and external financial controls require independent DBA/Security review before any positive canonical writer implementation.
5. Existing PRs are not merged by this branch, and no deployment, cloud resource, credential or customer funds are involved.

## Next acceptance sequence

- Finalise non-forgeable transaction-bound session identity and revocation lock design.
- Independently audit each minimum table SELECT/UPDATE/INSERT grant, FORCE-RLS USING/WITH CHECK policy, function and trigger identity.
- Implement actual restricted-role positive canonical reserve/capture/release and negative idempotency, cross-owner, overspend, rollback and two-connection revocation-race tests, confined to disposable CI before any staging consideration.
- Obtain separate Security/DBA review plus explicit protected-branch merge decision.

**Staging NO-GO · Production NO-GO · Live money NO-GO · Cloud spending not authorised.**
