# PAY54 Acceleration Wave 9 — Financial Writer RLS Role Admission and Rollback

27 November 2026 · **Source-only / PostgreSQL 16 disposable acceptance** · NOT a financial-authorisation migration.

## Baseline verified

The original canonical `pay54.reserve_wallet_transfer`, `capture_reserved_wallet_transfer` and `release_reserved_wallet_transfer` remain SECURITY INVOKER with no approved runtime money execution. Wave7 proved restricted non-superuser execution using fixture-specific grants and hard-coded tenant IDs. Wave8 proved physical canonical capture-vs-revocation lock ordering across two PostgreSQL sessions, with synthetic fixture cleanup. Neither supplies deployable multi-tenant writer RLS rules.

## Delivered in Wave9

1. `backend/db/release/writer-rls-v1-forward-review.sql` creates two new **NOLOGIN, NOINHERIT, NOSUPERUSER, NOBYPASSRLS** candidate roles and five *RESTRICTIVE DENY-ALL* RLS policies for canonical wallets, accounts, entries, journals and reservations. No table privileges, financial function grants, role memberships, SECURITY DEFINER routine, service credentials or customer funds are created. The script refuses any database other than `pay54_disposable_ci` and requires the existing restricted wallet-reader + FORCE RLS forward posture.
2. `backend/db/tests/batch62/001_writer_rls_candidate_denial.sql` switches the effective PostgreSQL role to the candidate owner and proves SELECT and canonical financial EXECUTE remain forbidden under the actual engine.
3. `backend/db/release/writer-rls-v1-rollback-review.sql` removes **only** those five deny policies and the two new roles, and verifies the original wallet-reader function, FORCE RLS and all five Wallet38 financial SELECT policies remain intact.
4. The full disposable PG16 regression runs forward → actual effective-role denial → rollback **after** Wave8 physical capture-vs-revocation and **before** the original wallet-reader rollback. Source CI checks prevent financial grants and accidental RLS weakening.

## Review finding: no production RLS writer migration authorised

This package is a deliberately **fail-closed scaffold**, not a usable financial writer. It does not solve the production per-tenant RLS policies or add a non-forgeable service identity. A production authorisation would require a separate reviewed transaction-bound wrapper with no role impersonation, narrow grant graph, verified owner/account context, cross-tenant and overspend denials, outbox and immutable-ledger trigger permissions, key rotation, reverse-order revoke race and operational rollback.

No hard-coded Wave7 test policies may migrate into production. No claim of a positive production-compatible writer or actual customer money. The Wave9 roles and restrictive policies are disposable-only proof; a future managed staging migration must undergo independent DBA/Security design and cost approval.

## Consolidated P0 remaining

| Gate | Evidence required |
|---|---|
| FIN-01 | Production safe actor/context-sensitive RLS per financial table with true restricted effective role |
| FIN-02 | Approved signed, non-forgeable principal binding and service identity |
| FIN-03 | Positive canonical reserve/capture/release with replay, cross-tenant, overspend and two-way concurrent revoke |
| SRC-01 | Cumulative unmerged PR stack inspection, explicit source merge approval and protected CI |
| CLOUD-01 | Full GBP compute/storage/backup/egress quote, separate charge authorisation and recovery plan |
| RAILS-01 | UK-Nigeria partner settlement, regulatory, KYC/AML and reconciliation acceptance |

**Source merge NO-GO unless separately authorised · Paid staging NO-GO · Production NO-GO · Customer money NO-GO.**
