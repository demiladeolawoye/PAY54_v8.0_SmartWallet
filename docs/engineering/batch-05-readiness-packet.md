# PAY54 Project Titan — Batch 05 Engineering Readiness Packet

**Date:** 2026-11-15  
**Source branch:** `project-titan`  
**Baseline SHA:** `ce3e4657dacd4696d2b205e81927651695748eb4`  
**Approval:** Non-deploying engineering implementations 62–91 only.

## Source change boundaries

- Shared immutable account SQL query catalogue implemented and used by existing account and personal wallet readers.
- Exact account SQL statement validation uses catalogue identities, UUID parameters and authenticated principal position.
- Read-only transaction adapter requires a trusted principal and a separate, reviewed pool and statement policy; no external database is contacted by the implementation.
- Fail-closed result validation, bounded account-access audit events and buffered HTTP disclosure protection are source contracts only.
- Account-switch label cache, one-use selection-intent and per-instance rate limiter are not wired into the production-facing dashboard.
- Restricted PostgreSQL role remains NOLOGIN, unassigned and without customer access. Migration 012 is unchanged, and SQL privilege matrix 013 is test-only.
- Existing financial journal, reservations and posting functions are unchanged. No financial transaction was initiated.
- No Google Cloud configuration, network, cloud resources, secrets, external providers or production IAM was touched.

## Verification requirements

| Check | Evidence | Gate |
|---|---|---|
| Canonical account SQL query tests | `backend/tests/account-query-catalogue.test.mjs`, `backend/tests/account-readers-catalogue.test.mjs` | Must pass |
| Read-only account binding/pool lifecycle | `backend/tests/account-read-binding.test.mjs`, `backend/tests/account-read-isolation.test.mjs` | Must pass |
| Result-validation and HTTP audit | `backend/tests/account-read-results.test.mjs`, `backend/tests/account-access-observer.test.mjs` | Must pass |
| Cache, replay and abuse limit | `backend/tests/account-view-cache.test.mjs`, `backend/tests/account-selection-intent.test.mjs`, `backend/tests/account-request-limiter.test.mjs` | Must pass |
| SQL privilege matrix | `backend/db/tests/013_account_privilege_matrix.sql` in disposable PostgreSQL | Must pass |
| Offline source governance | `backend/governance/account-source-security.mjs` plus mutation tests | Must pass |
| Regression | Full backend, account boundary, integrated source-only CI | Must pass |
| Live runtime/IAM/RLS, payments, cloud and production | No authorisation or deployed evidence | **NOT VERIFIED / BLOCKED** |

## Approval and risk acceptance

The review packet explicitly does not authorise granting SELECT/EXECUTE, introducing a PostgreSQL LOGIN role, mounting routes, setting production secrets, processing customer balances or any payment activity. The next proposed batch needs fresh approval for item 92 and beyond. Before any live customer account read, a separate independent security sign-off must establish real verifier semantics, transaction-level RLS grants, on-call audit sink and operational monitoring.

**Readiness disposition:** SOURCE_ONLY; CI_VERIFICATION_REQUIRED; STAGING_RELEASE_BLOCKED; CLOUD_PROVISIONING_DISABLED; FINANCIAL_EXECUTION_DISABLED.
