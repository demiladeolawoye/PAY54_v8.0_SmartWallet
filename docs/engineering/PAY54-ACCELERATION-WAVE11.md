# PAY54 Acceleration Wave 11 — Trusted Financial Identity & Positive Tenant Denial

28 November 2026 · Disposable-only engineering · NO LIVE MONEY / NO DEPLOY

## Baseline

The Wave10 candidate has 28/28 GitHub checks green at `897cd0f685f9c60a928b7e49675a02036963c575`; PRs #107 and #108 are approved but remain DRAFT and unmerged. Wave10's policy predicates retain `false AND`; they **do not authorize a real financial writer**.

## Delivered implementation

**Server transaction adapter** `backend/src/wave2/disposable-financial-gateway.mjs` creates a *deliberately unmounted*, dependency-injected gateway with server-side SHA-256 derivation from a canonical 32-byte bearer, strict validated amount/int64/idempotency/operation identifiers, a bounded transaction, effective-role/database guard and fail-closed rollback. The caller-supplied UUID is never treated as authenticated identity: the existing Wave7 database wrapper resolves canonical `auth_sessions` via the secret token digest and retains the session row lock for the same transaction.

The adapter cannot activate in any environment other than `DISPOSABLE_CI`, does not acquire cloud credentials or grant DB roles, and requires an existing restricted database identity with a real, independently provisioned connection. **The Node tests use a controlled driver fixture**; no end-to-end Node → physical PostgreSQL service identity is claimed. This work is a testable application security boundary, not a deployable payment service.

**Genuine PostgreSQL 16 financial proof** `backend/db/tests/batch64/positive_tenant_denial.py` invokes the already reviewed Wave7 canonical non-superuser SECURITY DEFINER fixture *inside a single transaction that rolls back*. It preserves Wave7's positive reserve, replay, capture, release, balanced double entry and outbox assertions while additionally proving:
- Attempting to reserve against a **different customer's source account** is denied with canonical SQLSTATE P5403.
- Spending more than the remaining available balance fails with P5401.
- Replaying a key with a different request digest fails with P5402.
- Presenting a valid credential with a different account context is denied with P5457.

A failure in any denial aborts CI. The verified disposable rollback marker must be present. No test roles, RLS fixtures, fake money or permissions persist.

## Security / DBA blockers

The Wave7 and Wave11 positive tests use **fixture-specific financial RLS policies** and an ephemeral credential digest, not a deployable trusted service. It would be unsafe to copy these predicates into production or to authorise the Wave9/Wave10 deny-only candidate for financial execution. A production-compatible positive writer still requires a separately approved **least-privilege grant graph** across tables/triggers/outbox, non-forgeable token authority with rotation/revocation guarantees, real tenant-specific FORCE RLS, verified role connection, cross-owner capture/release and overspend races, and an independent DBA and Security sign-off. Wave8 separately tests one canonical revocation locking order.

**Integration admission:** cumulative source PR #108 remains DRAFT and unmerged. Wave11 stacks on its SHA, without merging #108 or changing `project-titan`. The source/DBA/Security/QA/Release decision is independent of a normal GitHub approving review. No live customer data, provider execution, paid staging, deployment or financial grants are approved.

**Managed staging NO-GO · Production NO-GO · Customer money NO-GO · Cloud spending not authorised.**
