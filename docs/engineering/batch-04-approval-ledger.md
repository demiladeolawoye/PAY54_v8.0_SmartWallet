# PAY54 Engineering Batch 04 — Approved implementations 47–61

**User approval:** 2026-11-15. **Branch:** `project-titan`. **Baseline:** `0fb68aa717a6047effdd97fbac035ec955acda9d`.

Scope is restricted to source-only backend account-read security, PostgreSQL least-privilege role foundations, transactional connection isolation, audit records and regression tests. **No live migrations, runtime mounting, PostgreSQL credentials, IAM changes, cloud deployment, financial postings, production release or paid services are authorised.**

| Item | Deliverable | Evidence path | Status |
|---|---|---|---|
| 47 | Restricted account-reader NOLOGIN database role | `backend/db/migrations/012_account_read_role_baseline.sql` | PENDING |
| 48 | PostgreSQL role/privilege regression checks | `backend/db/tests/012_account_read_role_baseline.sql` | PENDING |
| 49 | Disposable PostgreSQL reader-role CI | `.github/workflows/pay54-account-reader-role-tests.yml` | PENDING |
| 50 | Transaction-scoped read-only PostgreSQL adapter | `backend/db/account-read-transaction.mjs` | PENDING |
| 51 | Pool release, rollback, concurrency isolation tests | `backend/tests/account-read-transaction.test.mjs` | PENDING |
| 52 | Account SQL statement contract and allowlist | `backend/db/account-sql-policy.mjs` | PENDING |
| 53 | SQL contract injection/mutation regression | `backend/tests/account-sql-policy.test.mjs` | PENDING |
| 54 | Bounded security audit-event projector | `backend/security/account-access-audit.mjs` | PENDING |
| 55 | Security audit redaction/failure tests | `backend/tests/account-access-audit.test.mjs` | PENDING |
| 56 | Account HTTP security headers hardening | `backend/http/account-context-handler.mjs` | PENDING |
| 57 | HTTP cache/CORS/header test expansion | `backend/tests/account-context-handler.test.mjs` | PENDING |
| 58 | Revalidation gate against stale account states | `backend/domain/account-read-revalidation.mjs` | PENDING |
| 59 | Session/account revocation negative tests | `backend/tests/account-read-revalidation.test.mjs` | PENDING |
| 60 | Integrated CI and security-review evidence | `.github/workflows/pay54-account-access-integration.yml` | PENDING |
| 61 | Consolidated report and stop gate | `docs/engineering/batch-04-consolidated-report.md` | PENDING |

Each deliverable requires a GitHub commit and applicable passing tests; canceled/failed CI is not a pass. Existing financial migrations 001–011 and posting logic must remain unchanged.

**STOP after implementation 61.** Batch 05 / item 62 requires fresh user approval. Staging release BLOCKED; financial execution DISABLED; cloud provisioning DISABLED.
