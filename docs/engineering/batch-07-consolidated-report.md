# PAY54 Enterprise Engineering Office — Batch 07 Consolidated Report

**Date:** 2026-11-15  
**Repository:** `demiladeolawoye/PAY54_v8.0_SmartWallet`  
**Branch:** `project-titan`  
**Baseline:** `6591d9b29d8c27c5913036800702d1c9261f1ccb`  
**User-approved scope:** Implementations 122–151 (30 source-only deliverables).  
**Outcome:** 30/30 source deliverables implemented and committed, relevant GitHub Actions tests passed.  
**Cloud provisioning:** DISABLED; **Financial execution:** DISABLED; **Live DB migration:** NOT APPLIED; **Staging/production release:** BLOCKED.

## 1. Engineering summary

Batch 07 strengthens the existing Personal/Business account-access foundation without creating live banking functionality. It preserves PostgreSQL's intentionally restrictive deny-all account reader policies and the existing unassigned NOLOGIN database role. New source-only modules add independent, verified-principal identity envelopes, an account-scoped request guard, read-only query preparation, revocation freshness checks, single-use replay contracts, privacy-safe audit data and evidence-based database role/RLS reviews.

A disposable PostgreSQL 16 test creates two synthetic tenant accounts and validates that restrictive RLS blocks account/membership data under **test-only grants enclosed in a transaction that is rolled back**. No production grants or migrations were made.

The batch does **not** implement a trusted live PostgreSQL tenant identity binding, allow an account reader to query customer records, mount account routes, enable Personal/Business switching or activate a payment/settlement service.

## 2. Deliverable register

| # | Implementation | Evidence |
|---|---|---|
| 122 | Database tenant-identity trust decision, explicit unspoofable identity requirements | `docs/security/batch-07-db-identity-design.md` |
| 123 | Read-only PostgreSQL role inventory assessor | `backend/governance/account-reader-role-audit.mjs` |
| 124 | Role login, inheritance, grants and membership negative tests | `backend/tests/account-reader-role-audit.test.mjs` |
| 125 | Opaque verified-principal account read transaction binding | `backend/db/account-identity-transaction.mjs` |
| 126 | Forged principal and query mutation transaction tests | `backend/tests/account-identity-transaction.test.mjs` |
| 127 | Fresh backend revocation-status policy | `backend/security/account-revocation-freshness.mjs` |
| 128 | Revocation outage, stale response and ambiguity tests | `backend/tests/account-revocation-freshness.test.mjs` |
| 129 | One-use session replay contract with injected atomic claim backend | `backend/security/account-session-replay.mjs` |
| 130 | Replay, collision and backend outage negative tests | `backend/tests/account-session-replay.test.mjs` |
| 131 | Business account list filtering through current membership | `backend/domain/account-read-scope.mjs` |
| 132 | Cross-business and revoked-membership list tests | `backend/tests/account-read-scope.test.mjs` |
| 133 | Disposable PostgreSQL two-tenant RLS deny and rollback test | `backend/db/tests/015_account_rls_cross_tenant.sql` |
| 134 | Dedicated PostgreSQL cross-tenant isolation CI | `.github/workflows/pay54-account-cross-tenant-db-tests.yml` |
| 135 | Minimised immutable account access audit envelope | `backend/security/account-audit-envelope.mjs` |
| 136 | Audit field minimisation, invalid decision and sink-failure tests | `backend/tests/account-audit-envelope.test.mjs` |
| 137 | Canonical parameterised tenant read query guard | `backend/db/account-tenant-query-guard.mjs` |
| 138 | Malicious query identifier/account parameter and forged-principal tests | `backend/tests/account-tenant-query-guard.test.mjs` |
| 139 | Explicit legacy Personal wallet versus Business and cross-owner isolation tests | `backend/tests/account-business-wallet-isolation.test.mjs` |
| 140 | In-memory opaque account request identity envelope | `backend/security/account-identity-envelope.mjs` |
| 141 | Forged, copied and unverified account identity negative tests | `backend/tests/account-identity-envelope.test.mjs` |
| 142 | Unmounted server request scope requiring current membership | `backend/http/account-request-scope.mjs` |
| 143 | Business membership revocation, cross-account and forged scope tests | `backend/tests/account-request-scope.test.mjs` |
| 144 | Offline account source-safety guard validating three restrictive policies and NOLOGIN role | `backend/governance/account-batch07-safety.mjs` |
| 145 | Privilege, identity, policy and transaction mutation regression tests | `backend/tests/account-batch07-safety.test.mjs` |
| 146 | Structured PostgreSQL RLS metadata review contract | `backend/governance/account-rls-metadata.mjs` |
| 147 | RLS forced/policy/relation/role drift negative tests | `backend/tests/account-rls-metadata.test.mjs` |
| 148 | Verified identity-to-request scope, read-only query and audit integrated tests | `backend/tests/account-batch07-integration.test.mjs` |
| 149 | Integrated isolated PostgreSQL + Node.js security CI | `.github/workflows/pay54-account-batch07-integration.yml` |
| 150 | Independent security/readiness risk packet | `docs/security/batch-07-security-readiness.md` |
| 151 | This consolidated report and Batch 07 approval ledger closure | `docs/engineering/batch-07-consolidated-report.md` |

## 3. Verified GitHub Actions evidence

| GitHub Actions workflow | Run ID | Verified result |
|---|---|---|
| PAY54 Account Cross-Tenant Denial | `43772280856` | **SUCCESS**, dedicated disposable PostgreSQL RLS test |
| PAY54 Account Boundary Tests | `43772839166` | **SUCCESS**, latest backend account security source |
| PAY54 Backend Tests | `43772839146` | **SUCCESS**, full backend/domain regression |
| PAY54 Batch 07 Account Security Integration | `43772839113` | **SUCCESS**, disposable PostgreSQL migrations 001–013, SQL suites 007–015, account Node.js tests and disabled-mode assertions |

The last three workflows tested the same source commit `4d35d751bc685a4aa07d927a711a76ab051d5ef0`. The dedicated cross-tenant workflow tested source commit `833cec1b8082abee754ac87498995e49f00c14fb`. Later report/readiness documentation changes do not modify the verified runtime source.

### Intermediate CI findings and corrections

During assembly, the new governance auditor was too permissive in three ways: it could accept one intact restrictive RLS policy instead of all three, detect `NOLOGIN` only in comments rather than in the role declaration, or see an imported membership function without verifying that the application actually invoked it. These failures were surfaced by mutation tests and corrected in source commits `5d51fb3e5628ab8d8ffe70722bede2c85b5644b7`, `0707c69c62e9584f91959c624a44796e9ef407b0`, `98a7ffc4808bbbaa2a0a5ec703f46d780ecd00f7`, and accompanying test update `4d35d751bc685a4aa07d927a711a76ab051d5ef0`. Superseded failed and cancelled runs remain visible in GitHub. The final workflows passed.

## 4. Security and compatibility assessment

- **Identity:** Only privately verified server principal objects can be wrapped in the new account identity envelope. Account ID, request body or browser-selection data cannot mint authentication.
- **Database:** Existing account SQL uses immutable parameterised templates. The new transaction adapter does not create login credentials, call production PostgreSQL, grant privileges or change ledger execution.
- **RLS:** Existing migration 013 continues to deny account and membership reads for the dormant NOLOGIN account-reader role. The test-only grants are rolled back and cannot be carried into customer deployments from CI.
- **Membership and wallet isolation:** Current membership, account status and account IDs are required for eligible display. Legacy personal-wallet bindings are not accepted for Business accounts.
- **Revocation/replay:** New contracts require an injected authoritative backend; durable replay, revocation, session transport and live logout integration are NOT implemented.
- **Audit:** Only fixed fields, generated correlation IDs, standard outcomes/reasons and timestamps are included. No customer IDs, balances, signed tokens or personally identifying request payloads are emitted by these new envelopes.
- **Financial and infrastructure:** Existing financial migrations, posting functions, ledger, balance reservations, mobile features, production IAM and GCP configuration were not modified.

## 5. Open release/security risks — all require separate sign-off

1. No active, independently approved tenant-specific PostgreSQL RLS SELECT policy and authenticated database role; **no live account reads are possible through the new denied role**.
2. No production-grade durable revocation/replay service, token transport integration, browser CSRF protections, real audit sink, distributed request limiter or authenticated account HTTP mounting.
3. SQL negative tests prove deny-all isolation, not legitimate authorised tenant visibility. Positive authorised reads require a future separate migration and an independent security review.
4. No completed Personal/Business dashboard account switching, customer onboarding, business KYB, beneficial-owner checks or regulated provider authorisation.
5. No independent Google Cloud STG-05 egress/network verification, staging operational approvals, resilience assessment or live penetration test.
6. No production release or financial execution was authorised by this engineering batch.

## 6. CTO recommendation for implementation 152

Next source-only scope should begin with an **independently reviewable nonspoofable database tenant-identity trust design**, then add explicit capability-bound, least-privilege SQL entry points and realistic deny/allow cross-tenant tests in isolated environments. No customer-data grants, live database role migration, deployment, monetary processing or account switching should be activated without separate approval.

**STOP AT 151. Implementation 152 and Batch 08 require fresh explicit user approval.**

**Final disposition:** BATCH_07_30_OF_30_SOURCE_COMPLETE / CI_PASSED / LIVE_ACCOUNT_ACCESS_NOT_ENABLED / CLOUD_PROVISIONING_DISABLED / FINANCIAL_EXECUTION_DISABLED / STAGING_RELEASE_BLOCKED.
