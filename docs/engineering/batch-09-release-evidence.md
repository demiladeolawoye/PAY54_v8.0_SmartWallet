# PAY54 Batch 09 — Nonactivation & Release Evidence

**Date:** 2026-11-16 · **Branch:** `project-titan` · **Target:** Implementations 182–211

## Source compatibility boundaries

- Baseline `3ca45625a42c71a73cde50570a31c33c23dcc4f3` followed completed Batch 08. Its pending full-backend GitHub run `43773902427` is now **SUCCESS**.
- Batch 09 changes are limited to account security, identity, read-only source contracts, disposable SQL tests, CI and governance documentation. Existing financial ledger, wallet engine, reservation and posting functions are unchanged.
- Existing migrations 001–013 are preserved. The dormant PAY54 account reader role remains `NOLOGIN`, unassigned and with zero customer-data grants. Deny-only RLS remains effective.
- SQL test files 019–021 use synthetic tenant roles and a test-owned relation inside `BEGIN`/`ROLLBACK`. The disposable PostgreSQL workflows have no production PostgreSQL address or credentials.
- No actual database credential creation, provider integration, Cloud Run service, GCP IAM, egress configuration, network provisioning, main-branch merge or release occurred.
- The database actor introspection and reviewer callback are source-only. They do **not** establish a production authenticated DB role, even when mocked regression tests pass.

## Verification gates

| Check | Evidence | Requirement |
|---|---|---|
| SQL positive and negative tenant ACL | `backend/db/tests/019_account_role_acl_proof.sql` | CI success |
| SQL spoofing and rollback | `backend/db/tests/020_account_role_acl_adversarial.sql`, `021_account_role_acl_rollback.sql` | CI success |
| Role attribute and mapping | `backend/tests/account-db-actor-policy.test.mjs` | CI success |
| Actor metadata/provenance | `backend/tests/account-connection-provenance.test.mjs` | CI success |
| Client pool, one-use lease, current membership | `backend/tests/account-pool-quarantine.test.mjs`, `account-read-lease.test.mjs`, `account-current-membership.test.mjs` | CI success |
| Audit/revocation and error disclosure | `backend/tests/account-read-audit-gate.test.mjs`, `account-post-read-revocation.test.mjs`, `account-error-boundary.test.mjs` | CI success |
| Combined trust integration and source mutation tests | `account-batch09-integration.test.mjs`, `account-batch09-source-audit.test.mjs` | CI success |
| Full PAY54 backend compatibility | `PAY54 Backend Tests` | CI success |
| Deployment, staging and payments | No authorisation | **BLOCKED** |

## Approval boundary

Even passing all automated CI is not live banking security or regulatory sign-off. No production customer data or financial services will be activated under Batch 09. Full report must state exact workflow results and intermediate defects; item **212 is unapproved** until a fresh user instruction.
