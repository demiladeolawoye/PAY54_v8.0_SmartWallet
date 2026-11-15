# PAY54 Project Titan — Engineering Batch 06 Approval Ledger

**Approved:** 2026-11-15 · **Implementations:** 92–121 (30 source-only deliverables)  
**Branch:** `project-titan` · **Baseline:** `fda52344969dc73389ed48fe0aad4ca1586ef261`

| # | Engineering deliverable | Evidence | Status |
|---|---|---|---|
| 92 | Document RLS trust and authenticated session threat model | `docs/security/batch-06-rls-identity-threat-model.md` | PENDING |
| 93 | Deny-by-default account RLS policies in migration 013 | `backend/db/migrations/013_account_rls_denial.sql` | PENDING |
| 94 | RLS denial and privilege negative SQL tests | `backend/db/tests/014_account_rls_denial.sql` | PENDING |
| 95 | Disposable PostgreSQL RLS workflow | `.github/workflows/pay54-account-rls-denial.yml` | PENDING |
| 96 | Pinned-key Ed25519 session verifier | `backend/security/account-jws-verifier.mjs` | PENDING |
| 97 | Signed session signature and claim regression tests | `backend/tests/account-jws-verifier.test.mjs` | PENDING |
| 98 | Trusted principal adapter for signed session | `backend/security/account-session-adapter.mjs` | PENDING |
| 99 | Signed session principal integration tests | `backend/tests/account-session-adapter.test.mjs` | PENDING |
| 100 | Cryptographic key policy and rotation contract | `backend/security/account-trust-key-policy.mjs` | PENDING |
| 101 | Unknown, retired and malformed key negative tests | `backend/tests/account-trust-key-policy.test.mjs` | PENDING |
| 102 | Revocation callback and replay controls | `backend/security/account-session-revocation.mjs` | PENDING |
| 103 | Revocation failure and replay tests | `backend/tests/account-session-revocation.test.mjs` | PENDING |
| 104 | Strict account RLS policy attestation audit | `backend/governance/account-rls-audit.mjs` | PENDING |
| 105 | RLS audit mutation/negative tests | `backend/tests/account-rls-audit.test.mjs` | PENDING |
| 106 | Account tenant access anti-leak policy | `backend/domain/account-tenant-boundary.mjs` | PENDING |
| 107 | Cross-tenant account and organisation tests | `backend/tests/account-tenant-boundary.test.mjs` | PENDING |
| 108 | Auth-bound account list response envelope | `backend/http/account-auth-response.mjs` | PENDING |
| 109 | Unauthorized and sanitisation response tests | `backend/tests/account-auth-response.test.mjs` | PENDING |
| 110 | Per-principal security audit correlation contract | `backend/security/account-audit-correlation.mjs` | PENDING |
| 111 | PII and audit correlation negative tests | `backend/tests/account-audit-correlation.test.mjs` | PENDING |
| 112 | Account session anti-CSRF policy contract | `backend/security/account-csrf-policy.mjs` | PENDING |
| 113 | Origin and CSRF negative tests | `backend/tests/account-csrf-policy.test.mjs` | PENDING |
| 114 | Account access role capability policy | `backend/domain/account-capability-grants.mjs` | PENDING |
| 115 | Separation of duties and role tests | `backend/tests/account-capability-grants.test.mjs` | PENDING |
| 116 | Authenticated isolation integration tests | `backend/tests/account-auth-isolation-integration.test.mjs` | PENDING |
| 117 | Signed session and RLS source governance gate | `backend/governance/account-auth-security.mjs` | PENDING |
| 118 | Governance mutation and fail-closed tests | `backend/tests/account-auth-security.test.mjs` | PENDING |
| 119 | Combined SQL and Node CI integration | `.github/workflows/pay54-account-auth-rls-integration.yml` | PENDING |
| 120 | Independent review packet and unchanged deployment gates | `docs/security/batch-06-auth-rls-readiness.md` | PENDING |
| 121 | Consolidated report, 30-item closure and stop | `docs/engineering/batch-06-consolidated-report.md` | PENDING |

All items require meaningful complete implementations or verifiable security evidence, with GitHub commit and relevant automated regression evidence. **No** main-branch merge, production/staging deployment, live PostgreSQL migration, IAM or database grants, client records, secrets, Cloud provisioning, financial or provider execution. Do not activate a customer account switcher. Existing money-engine and payment posting must be unchanged. Independent reviewer sign-off remains separate.

**Stop at 121; implementation 122 requires fresh explicit user approval.**
