# PAY54 Batch 56 — Canonical Financial Writer Security & Transaction Admission

25 November 2026 · PAY54 protected branch integration stack · **source and disposable database validation only**.

## Exact financial architecture inspected
`backend/db/migrations/003_wallet_reservation.sql` defines `pay54.reserve_wallet_transfer` (trusted owner UUID, source account, destination wallet, amount, idempotency key, request digest, expiry) with `SECURITY INVOKER`. It serialises duplicate requests using a transaction advisory lock and `idempotency_records`, locks source accounts, checks posted-minus-held funds, and inserts `financial_operations`, `balance_reservations` and `outbox_events` in one transaction.

`backend/db/migrations/004_reservation_lifecycle.sql` defines `pay54.capture_reserved_wallet_transfer` and `pay54.release_reserved_wallet_transfer`, also `SECURITY INVOKER`. Capture posts a ledger journal and balanced entries, marks the reservation and operation settled, and writes outbox activity. Release transitions held funds without a transfer posting. Both reject invalid operation ownership or lifecycle state.

The proposed Batch38 forward candidate applies `FORCE ROW LEVEL SECURITY` to `wallets`, `ledger_accounts`, `ledger_entries`, `ledger_journals`, `balance_reservations` for the **restricted read-owner** role. It does not establish a permitted, session-bound financial writer. The existing `pay54_ledger_executor_role` is NOLOGIN, NOBYPASSRLS and forbidden financial execution/DML. Blindly granting money functions or broad ledger writes would be unsafe.

## Batch56 delivered
- Executable `001_canonical_writer_admission_denial.sql` runs **read-only** after the reviewed FORCE-RLS forward candidate and before its rollback, in the same disposable PostgreSQL 16 CI. It verifies the exact three invoker functions, five forced financial RLS relations, and the executor's continued absence of financial function execution and INSERT/UPDATE/DELETE privileges on all nine relevant tables.
- Source governance gate and negative tests enumerate non-negotiable transactional identity, access control, balance, idempotency, revocation, outbox and rollback evidence. Even an all-true *self-reported* evidence object cannot authorise live payments, cloud spend or release.
- No new role, SQL privilege grant, production financial transaction, authentication route, managed staging migration or payment-provider connection is implemented.

## Canonical positive writer blockers (required next, separate reviewed implementation)
1. Define transaction-bound authentication attestation: bearer/session digest and version must be verified from trusted DB state while the **same physical transaction** retains its session lock. Owner UUID supplied to current functions must not be treated as independently authenticated.
2. Design precise, independently audited table grants and FORCE-RLS policy predicates for the minimum legitimate ledger writer. With `SECURITY INVOKER`, each SELECT / SELECT FOR UPDATE / INSERT / UPDATE must be covered without expanding PUBLIC or the restricted read-owner role. Avoid GUC-based caller impersonation.
3. Resolve writer/revoker lock order and session version linearisation; test physical concurrency and deadlocks with genuine non-superuser effective identities.
4. Execute real **canonical** reserve, capture, release and reversal tests on synthetic customer fixtures under that exact writer identity; prove journal balancing, idempotent replay, overspend/tenant denial, outbox atomicity and complete forward/rollback compatibility.
5. Obtain independent DBA and Security review, explicit finance/provider settlement approvals, final GBP cost quote and authorised operational deployment plan.

**Batch55's two-connection positive posting proof was isolated in synthetic `pay54_b55`, not canonical `pay54`. Batch56 is therefore a truthful canonical admission check, not a claim that the canonical positive writer works.**

**Source integration remains separately gated; managed staging NO-GO; production NO-GO; spending NOT AUTHORISED.**
