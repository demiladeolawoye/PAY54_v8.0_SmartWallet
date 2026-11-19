# PAY54 CTO — Batch 23 Source Engineering Closure

**Founder-approved batch:** 23, engineering actions 868–917.
**Code review:** Draft PR #11, stacked on unmerged Draft PR #10.
**Result:** 50/50 numbered source engineering actions committed for review.
**Operational result:** No staging or production database migration, account switch, card funding, regulated payment, IAM permission or Pages deployment activated.

## What changed

- Added migration 018 with transaction-atomic session rebinding, old-token revocation, new 256-bit credential-digest session, authoritative membership check, concurrency/version replay fence and mandatory durable audit in the same PostgreSQL transaction.
- Revised the initial direct-write design after security review: the callable NOLOGIN role now receives **EXECUTE only**. A separate NOLOGIN, NOINHERIT, NOBYPASSRLS, restricted SECURITY DEFINER function owner has minimal RLS-scoped session, account, membership and audit table rights. The SQL function has an explicit `search_path`, no caller-provided principal identity, and no ledger or payment-table grants.
- Added actual disposable PostgreSQL test cases for valid Personal→Business transition, revoked old credential, simultaneous replay, missing/forged CSRF, stale session generation, cross-tenant target denial, suspended account, revoked membership, expired session, session-ID/digest reuse, audit/token collision rollback and malformed input.
- Added server-only session-rotation adapter with canonical bearer parsing, HTTPS Origin, CSRF digest, trusted session, secret generation, exact callable role/ACL check and **no credential response before COMMIT**. Uncertain COMMIT quarantines the database connection.
- Added Ed25519-signed staging evidence validation, strict staging TLS/separate role configurations, actual effective-role read-only probes, canonical migration inventory and SHA256 drift checks, independent cutover review, candidate Pages artifact leakage inspection and GitHub deployer governance assessment.
- Added read-only source/security CI, account HTTP 503 tests, failure-path/adversarial Node tests, rollback runbook, threat model, device QA matrix, staging provisioning SOP and founder change/release decision reports.

## Verification contract

The dedicated `.github/workflows/pay54-batch23-session-rotation.yml` applies migrations 001–018 **in exact reviewed order** to disposable PostgreSQL 16, seeds only isolated synthetic identities, exercises all `backend/db/tests/batch23/*.sql`, executes a two-client concurrency race, and runs Batch 23 Node security tests and retained unprovisioned account/financial refusal tests.

**Exact latest SHA CI must be reconciled after this closure commit.** No earlier success, cancelled job, or synthetic test should be misrepresented as final-head acceptance. A failed test requires a committed fix and a new exact-SHA run before calling the batch verified.

## Remaining P0 operational blockers

1. Trusted identity/session **issuance and reauthentication** service, secure real HTTPS ingress, rate limiting, recovery and actual account-rotation wiring. The backend continues to return 503 for account/context routes.
2. Real PostgreSQL staging cluster, TLS/IAM, vetted role-to-login mappings, schema migrations/backup/PITR, cross-principal staging RLS and recovery.
3. Current GitHub Pages published artifact and historical source-exposure investigation; a candidate source scanner does not prove containment.
4. Protected GitHub release environment, OIDC deployer/cloud permissions and tested rollback.
5. Linked-card development-provider resolution and approved real funding/card partner.
6. Regulated UK–Nigeria financial partners, KYC/KYB, AML/sanctions, safeguarding, reconciliation and complaints/resilience acceptance.
7. Real Android, iOS, desktop, accessibility and ten-domain account cache and financial-data isolation tests.

The new source includes a restricted SECURITY DEFINER transaction function. Its owner, RLS privileges, grants, concurrency recovery and the entire deployment environment require independent Security/DBA approval before any role membership is provisioned.

## Accounting and release decision

The 50 numbered actions comprise source changes, design corrections, SQL/Node tests, CI improvements and engineering governance, **not 50 customer-visible features**. P0/P1 change requests and residual risks are tracked in `pay54-batch23-founder-register.md`.

PR #11 remains **DRAFT and unmerged**. No existing working dashboard, wallet, ledger, cards, funding or live release is intentionally modified. The production launch disposition remains **NO-GO**.

**Next engineering direction after source acceptance:** real operator-owned infrastructure and identity provisioning, source-controlled migration promotions, safe staging session issuer/rotation validation, QA and release assurance—never auto-enable money or account context solely on a green badge.
