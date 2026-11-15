# PAY54 Project Titan — Engineering Batch 06 Approval Ledger

**Approved:** 2026-11-15 · **Implementations:** 92–121 (30 source-only deliverables)  
**Branch:** `project-titan` · **Baseline:** `fda52344969dc73389ed48fe0aad4ca1586ef261`

| # | Engineering deliverable | Evidence | Status |
|---|---|---|---|
| 92 | Document RLS trust and authenticated session threat model | `docs/security/batch-06-rls-identity-threat-model.md` | COMPLETE — fcfcbdec signed identity/RLS threat model |
| 93 | Deny-by-default account RLS policies in migration 013 | `backend/db/migrations/013_account_rls_denial.sql` | COMPLETE — 4f6d1f77 migration 013 deny-only restrictive policies |
| 94 | RLS denial and privilege negative SQL tests | `backend/db/tests/014_account_rls_denial.sql` | COMPLETE — 3527891c SQL tests; 916cf638 correction |
| 95 | Disposable PostgreSQL RLS workflow | `.github/workflows/pay54-account-rls-denial.yml` | COMPLETE — 27ad8712 disposable RLS workflow |
| 96 | Pinned-key Ed25519 session verifier | `backend/security/account-jws-verifier.mjs` | COMPLETE — 395d21a1 pinned-key signed-session verifier |
| 97 | Signed session signature and claim regression tests | `backend/tests/account-jws-verifier.test.mjs` | COMPLETE — ff05e860 JWS signature/issuer/audience/expiry tests |
| 98 | Trusted principal adapter for signed session | `backend/security/account-session-adapter.mjs` | COMPLETE — 18b22b87 trusted-principal adapter |
| 99 | Signed session principal integration tests | `backend/tests/account-session-adapter.test.mjs` | COMPLETE — 641c2ac5 adapter negative tests |
| 100 | Cryptographic key policy and rotation contract | `backend/security/account-trust-key-policy.mjs` | COMPLETE — 192bcfbe pinned Ed25519 active/retired trust policy |
| 101 | Unknown, retired and malformed key negative tests | `backend/tests/account-trust-key-policy.test.mjs` | COMPLETE — 1256a90c invalid key tests |
| 102 | Revocation callback and replay controls | `backend/security/account-session-revocation.mjs` | COMPLETE — cde528af revocation backend contract |
| 103 | Revocation failure and replay tests | `backend/tests/account-session-revocation.test.mjs` | COMPLETE — fd854cb1 revocation outage tests |
| 104 | Strict account RLS policy attestation audit | `backend/governance/account-rls-audit.mjs` | COMPLETE — 03ad6cc9 RLS auditor; 1cc8efc3 correction |
| 105 | RLS audit mutation/negative tests | `backend/tests/account-rls-audit.test.mjs` | COMPLETE — a7005881 RLS mutation regression |
| 106 | Account tenant access anti-leak policy | `backend/domain/account-tenant-boundary.mjs` | COMPLETE — 0495588e tenant isolation policy |
| 107 | Cross-tenant account and organisation tests | `backend/tests/account-tenant-boundary.test.mjs` | COMPLETE — 9aafe851 cross-tenant and revocation tests |
| 108 | Auth-bound account list response envelope | `backend/http/account-auth-response.mjs` | COMPLETE — a428f446 minimal account response |
| 109 | Unauthorized and sanitisation response tests | `backend/tests/account-auth-response.test.mjs` | COMPLETE — fd3c48e2 sanitisation tests |
| 110 | Per-principal security audit correlation contract | `backend/security/account-audit-correlation.mjs` | COMPLETE — 52cbad55 audit correlation |
| 111 | PII and audit correlation negative tests | `backend/tests/account-audit-correlation.test.mjs` | COMPLETE — 00ec0ffd audit data minimisation tests |
| 112 | Account session anti-CSRF policy contract | `backend/security/account-csrf-policy.mjs` | COMPLETE — da826013 strict origin policy |
| 113 | Origin and CSRF negative tests | `backend/tests/account-csrf-policy.test.mjs` | COMPLETE — 5dd40ec7 cross-origin negative tests |
| 114 | Account access role capability policy | `backend/domain/account-capability-grants.mjs` | COMPLETE — a195b6b2 account role capability policy |
| 115 | Separation of duties and role tests | `backend/tests/account-capability-grants.test.mjs` | COMPLETE — 3b38a353 capability regression tests |
| 116 | Authenticated isolation integration tests | `backend/tests/account-auth-isolation-integration.test.mjs` | COMPLETE — bc47b39c signed principal integration; daad2392 deterministic tamper test |
| 117 | Signed session and RLS source governance gate | `backend/governance/account-auth-security.mjs` | COMPLETE — d575f123 source security assessor; 7c8d3547/6e866639/a344bc7a hardening |
| 118 | Governance mutation and fail-closed tests | `backend/tests/account-auth-security.test.mjs` | COMPLETE — 671b40df mutation tests; eae006c9/30a05fa9 correction |
| 119 | Combined SQL and Node CI integration | `.github/workflows/pay54-account-auth-rls-integration.yml` | COMPLETE — 0693e44f integrated CI run 43771585530 SUCCESS |
| 120 | Independent review packet and unchanged deployment gates | `docs/security/batch-06-auth-rls-readiness.md` | COMPLETE — 74348404 security readiness packet |
| 121 | Consolidated report, 30-item closure and stop | `docs/engineering/batch-06-consolidated-report.md` | COMPLETE — 924d9dfe consolidated report; full backend 43771585535 and account 43771585648 SUCCESS |

All items require meaningful complete implementations or verifiable security evidence, with GitHub commit and relevant automated regression evidence. **No** main-branch merge, production/staging deployment, live PostgreSQL migration, IAM or database grants, client records, secrets, Cloud provisioning, financial or provider execution. Do not activate a customer account switcher. Existing money-engine and payment posting must be unchanged. Independent reviewer sign-off remains separate.

**Stop at 121; implementation 122 requires fresh explicit user approval.**

## Batch 06 approval closure

**30/30 source deliverables complete.** Full report: `docs/engineering/batch-06-consolidated-report.md` (commit `924d9dfe5c9562545db60ebf1dca780dbefeeff1`). Verified GitHub Actions success: integrated PostgreSQL RLS plus Node authentication `43771585530`; backend `43771585535`; focused account boundary `43771585648`. Intermediate failed tests and corrections are preserved in the consolidated report.

**STOP AT 121.** Implementation 122 needs fresh explicit approval. No production/staging deployment, cloud provisioning, database customer access or real-money execution is authorised.
