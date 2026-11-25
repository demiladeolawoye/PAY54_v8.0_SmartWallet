# PAY54 Batch 57 — Canonical Writer Least-Privilege Design & FORCE RLS Compatibility

25 November 2026 · Source and genuine disposable PostgreSQL 16 audit · Not for deployment.

## Reviewed platform facts
- The canonical `reserve_wallet_transfer`, `capture_reserved_wallet_transfer`, and `release_reserved_wallet_transfer` functions use `SECURITY INVOKER`. They take a claimed authenticated owner UUID; *the database procedure alone does not authenticate that principal*.
- Existing source-only wallet reader forward migration enforces `FORCE RLS` on `wallets`, `ledger_accounts`, `ledger_entries`, `ledger_journals`, and `balance_reservations`. That rollout only includes reviewed **reader** policies; it does not contain acceptable writer `USING` / `WITH CHECK` policies.
- `pay54_ledger_executor_role` remains a non-login, non-superuser, non-bypass role. Its grants to execute financial functions and perform ledger DML are intentionally absent.

## Delivered
1. The design-only machine-readable candidate matrix, `backend/governance/pay54-batch57-canonical-writer-design.json`, enumerates each canonical primitive's anticipated table read/write scope, the required session row-lock and transactional owner attestation, and the explicit no-go/review blockers. It grants nothing and is **not** an automatically applicable RLS policy. Each table's privilege must be verified against SQL bodies, triggers, deferrable constraints and a DBA-reviewed plan before use.
2. The real `backend/db/tests/batch57/001_canonical_writer_rls_compatibility.sql` executes inside a read-only PostgreSQL transaction between the candidate reader forward and rollback, checks the five forced RLS relations and absence of writer policies, role membership and direct table privileges. It changes effective identity with `SET LOCAL ROLE pay54_ledger_executor_role` and checks direct canonical `ledger_accounts` SELECT is genuinely rejected. It verifies the exact three canonical financial EXECUTE permissions remain denied. **No ledger mutation is attempted.**
3. Source tests check exact ordering in the existing disposable integration workflow, forbid accidentally self-certifying this proposed design and ensure no unsafe grant is introduced.

## Architecture decision
A production customer-money writer must not be created by applying generic table grants or hard-coded synthetic policies. A safe route requires a *new independently reviewed* transaction-bound authentication boundary obtaining verified session owner/account membership from the database while holding a session row lock shared with revocation; scoped writer policies must derive from a trusted, non-forgeable actor context and preserve wallet/ledger isolation. The current caller-supplied owner UUID is not adequate authority.

Design first, then implement restricted writer policies and rollback on disposable PG16 with positive reserve/capture/release and denial tests under actual effective role, followed by real two-connection canonical transaction-vs-revocation concurrency. This is **not yet implemented**.

## Release gates and dependencies
PRs #81–#96 currently remain Draft and unmerged; #92 is the permanent combined Batches 41–49 candidate, with #93–#96 stacked. Governance and approval of PRs alone do not authorise a merge. Reconcile source integration and branch protection separately. Final GBP Cloud SQL quote, £25 budget controls, operational IAM/TLS/backup observability, external payment partner contracts, KYC/AML and provider reconciliation remain unverified for staging/production.

**NO cloud provisioning, source merge, production role grants, real-money execution or deployment. Staging NO-GO. Production NO-GO.**
