# PAY54 Engineering Batch 02 — Approved Implementations 17–31

**Approved:** 15 November 2026  
**Repository:** `demiladeolawoye/PAY54_v8.0_SmartWallet`  
**Branch:** `project-titan`  
**Baseline commit:** `177831bafadba16ce4b116ad92997489edb113a9`  
**Scope:** Source-only Personal/Business account context, identity, API contracts, wallet-binding safeguards, isolated CI and evidence  
**Authority:** User explicitly approved the next 15 implementations following verified implementation 16.

The batch **does not authorise** live Google Cloud changes, financial execution, production deployment, customer records, credential access, account activation, IAM grants, provider onboarding, merges to `main`, or any modification of the existing ledger posting machinery.

## Work packages

| # | Implementation | Acceptance artifact | Status |
|---|---|---|---|
| 17 | Trusted server-authenticated principal adapter | `backend/domain/trusted-account-principal.mjs` | PENDING |
| 18 | Authentication boundary regression tests | `backend/tests/trusted-account-principal.test.mjs` | PENDING |
| 19 | Non-mounted, read-only account-context HTTP handler | `backend/http/account-context-handler.mjs` | PENDING |
| 20 | HTTP access/verb/error negative tests | `backend/tests/account-context-handler.test.mjs` | PENDING |
| 21 | Safe account-list response projection | `backend/domain/account-public-projection.mjs` | PENDING |
| 22 | Data-minimisation regression tests | `backend/tests/account-public-projection.test.mjs` | PENDING |
| 23 | Backend account permission evaluator | `backend/domain/account-operation-policy.mjs` | PENDING |
| 24 | Separation-of-duty and permission tests | `backend/tests/account-operation-policy.test.mjs` | PENDING |
| 25 | Non-destructive personal legacy-wallet binding schema | `backend/db/migrations/009_personal_wallet_binding.sql` | PENDING |
| 26 | PostgreSQL wallet binding negative tests | `backend/db/tests/009_personal_wallet_binding.sql` | PENDING |
| 27 | Isolated PostgreSQL migration 009 CI gate | `.github/workflows/pay54-account-wallet-binding-tests.yml` | PENDING |
| 28 | Non-activating profile-switch selection state | `assets/js/dashboard/account-switch-selection.mjs` | PENDING |
| 29 | UI switching and keyboard selection contract tests | `backend/tests/account-switch-selection.test.mjs` | PENDING |
| 30 | Security and deployment readiness assessment | `docs/security/batch-02-account-context-security-review.md` | PENDING |
| 31 | Verified consolidated implementation report and next-stage recommendation | `docs/engineering/batch-02-consolidated-report.md` | PENDING |

Only a successful GitHub commit plus relevant automated testing or an explicitly documented verification gap can satisfy an item. A prior CI failure must be retained in the audit trail; it cannot be silently presented as passing. Item 31 closes the batch for new user approval.
