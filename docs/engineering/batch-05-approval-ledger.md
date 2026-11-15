# PAY54 Project Titan — Engineering Batch 05 Approval Ledger

**Approved:** 2026-11-15; implementations **62–91** (30 meaningful deliverables).  
**Branch:** `project-titan`; **baseline:** `ce3e4657dacd4696d2b205e81927651695748eb4`.  
**Scope:** Source-only canonical account SQL, Personal/Business access controls, read isolation, test infrastructure and governance.

| # | Deliverable | Target source | Status |
|---|---|---|---|
| 62 | Canonical immutable account SQL query catalogue | `backend/db/account-query-catalogue.mjs` | PENDING |
| 63 | Account-list reader canonical query migration | `backend/domain/account-context-reader.mjs` | PENDING |
| 64 | Account-selection reader canonical query migration | `backend/domain/account-context-reader.mjs` | PENDING |
| 65 | Personal wallet reader canonical query migration | `backend/domain/account-wallet-reader.mjs` | PENDING |
| 66 | SQL allowlist single-source-of-truth refactor | `backend/db/account-sql-policy.mjs` | PENDING |
| 67 | Canonical catalogue query/parameter contract tests | `backend/tests/account-query-catalogue.test.mjs` | PENDING |
| 68 | Account readers canonical query parity tests | `backend/tests/account-readers-catalogue.test.mjs` | PENDING |
| 69 | Verified-principal read query binding adapter | `backend/db/account-read-binding.mjs` | PENDING |
| 70 | Read binding authentication and SQL tests | `backend/tests/account-read-binding.test.mjs` | PENDING |
| 71 | Cross-request verified-principal isolation hardening | `backend/db/account-read-transaction.mjs` | PENDING |
| 72 | Concurrent and stale connection isolation tests | `backend/tests/account-read-isolation.test.mjs` | PENDING |
| 73 | Bounded reader result validation contract | `backend/db/account-read-results.mjs` | PENDING |
| 74 | Poisoned and oversized result negative tests | `backend/tests/account-read-results.test.mjs` | PENDING |
| 75 | Read-only HTTP account access audit decorator | `backend/http/account-access-observer.mjs` | PENDING |
| 76 | HTTP audit and failure denial tests | `backend/tests/account-access-observer.test.mjs` | PENDING |
| 77 | Account display cache isolation contract | `assets/js/dashboard/account-view-cache.mjs` | PENDING |
| 78 | Switch and revocation cache isolation tests | `backend/tests/account-view-cache.test.mjs` | PENDING |
| 79 | Account context selection token policy | `backend/domain/account-selection-intent.mjs` | PENDING |
| 80 | Selected-context integrity and expiry tests | `backend/tests/account-selection-intent.test.mjs` | PENDING |
| 81 | Unauthenticated account-route rate-limit contract | `backend/http/account-request-limiter.mjs` | PENDING |
| 82 | Account request limiter fail-closed tests | `backend/tests/account-request-limiter.test.mjs` | PENDING |
| 83 | Database privilege regression inventory | `backend/db/tests/013_account_privilege_matrix.sql` | PENDING |
| 84 | Disposable SQL privilege inventory CI | `.github/workflows/pay54-account-privilege-matrix.yml` | PENDING |
| 85 | Source-only account security contract lint | `backend/governance/account-source-security.mjs` | PENDING |
| 86 | Account source contract mutation tests | `backend/tests/account-source-security.test.mjs` | PENDING |
| 87 | Integrated account SQL + Node regression CI | `.github/workflows/pay54-account-catalogue-integration.yml` | PENDING |
| 88 | System interaction negative tests | `backend/tests/account-boundary-integration.test.mjs` | PENDING |
| 89 | Architecture and threat control reconciliation | `docs/security/batch-05-account-security-review.md` | PENDING |
| 90 | Release/no-deploy and contract compatibility evidence | `docs/engineering/batch-05-readiness-packet.md` | PENDING |
| 91 | Consolidated verified report and stop gate | `docs/engineering/batch-05-consolidated-report.md` | PENDING |

## Strict boundaries

Existing ledger posting, journal and reservation logic must not change. No live database migrations, granting new account read permissions, IAM/credential changes, provider onboarding, real-money execution, cloud provisioning or production deployment is authorised. An implementation must have a commit and relevant passing or transparently failed CI evidence before it is declared complete. Intermediate test failures are retained. No claim of working Personal/Business switching may be made from source contracts alone.

**Batch ends at 91. Implementation 92 requires explicit fresh approval.**
