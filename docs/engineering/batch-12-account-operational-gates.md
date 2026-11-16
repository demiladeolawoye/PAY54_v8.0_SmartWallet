# PAY54 Batch 12 — item 353: Authenticated account-context operational gate

**Date:** 2026-11-16
**Repository:** demiladeolawoye/PAY54_v8.0_SmartWallet
**Branch:** project-titan
**Decision:** Source-hardening delivered; real Personal/Business account switching remains BLOCKED.
**Environment:** No cloud provisioning, credential issuance, deployed API, customer data SELECT grant or real-money activation.

## Verified existing architecture

- \`backend/http/account-context-handler.mjs\` is explicitly **unmounted**, uses GET-only paths and protects its projected responses with \`Cache-Control: no-store, private\`, cross-origin denial, restricted content and minimal public account fields.
- \`backend/domain/account-context-reader.mjs\` uses fixed parameterised queries from \`backend/db/account-query-catalogue.mjs\` and checks account membership. **Item 351** adds identity revalidation after awaiting the database query, including catalogue listing and account selection.
- \`backend/tests/account-batch12-reader-principal-race.test.mjs\` (**item 352**) tests revoked sessions, changed principals, stable authorised reads, unauthenticated denial before database access and HTTP output denial after revocation.
- \`backend/db/migrations/008_account_context_foundation.sql\` defines Personal/Business accounts and memberships, enforces immutable account identity/ownership, and enables + forces RLS.
- \`backend/db/migrations/012_account_read_role_baseline.sql\` creates a **NOLOGIN / NOINHERIT / NOBYPASSRLS** account-reader role without customer table SELECT grants.
- \`backend/db/migrations/013_account_rls_denial.sql\` adds **RESTRICTIVE SELECT USING(false)** policies for the account reader; a permissive policy or future SELECT GRANT alone cannot activate reads while these protections remain.
- \`backend/db/tests/014–024\` cover disposable denial, cross-tenant isolation, role identity, ACL and rollback exercises. Synthetic CI is not live proof.

## Critical boundary

A source-only account-context reader is **not a functioning customer-data API**, and the existing migration 013 deliberately makes that true at the PostgreSQL privilege level. Neither an account-switching widget nor a passing synthetic RLS test changes the database's actual authorisation state. No "switch account" button should be activated against real customer data before this boundary is independently reviewed and a separate approved access design is implemented.

## Exact next operational dependencies

| Gate | Evidence needed | Owner | State |
|---|---|---|---|
| A-01 | Repository owner verifies GitHub Pages deployed artefacts, branch rules and protected environments | Founder + DevSecOps | OPEN |
| A-02 | Dedicated least-privilege deployer, immutable trusted Actions references, approved OIDC/cloud environment | Security + DevSecOps | NOT AUTHORISED |
| A-03 | Isolated private staging PostgreSQL 16 cluster, TLS peer verification, credential vault and zero privilege drift | Backend + Security | NOT PROVISIONED |
| A-04 | Independent code review of proposed migration replacing deny-only RLS, with role-mapping and cross-tenant negative proof | DBA + Security | DESIGN/APPROVAL OPEN |
| A-05 | Authenticated backend session lifecycle, revocation and CSRF, protected account selection and durable audit | Backend + Security | SOURCE CONTRACTS ONLY |
| A-06 | Account-specific card, recipient, wallet and transaction endpoints with deny-by-default freshness and RLS checks | Backend + QA | NOT CONNECTED |
| A-07 | Account-scoped ledger balance snapshot provenance, reconciliation, time-window accuracy and currency-scale proof | Fintech + QA | NOT CONNECTED |
| A-08 | Multi-user/multi-account/multi-tab stress, network-delay, role-revocation, business permission and pen tests | Security + QA | PENDING |
| A-09 | Explicit Founder/governance sign-off for staging account-data access and later production release | Founder + Compliance | BLOCKED |

## Safe engineering sequence

1. **Owner and security review of the real deployment environment.** Inspect Pages source and protected GitHub release settings before any exposure or credential changes.
2. **Independent tenant-identity and RLS acceptance.** Build a reviewed migration plan that maps trusted, independently authenticated DB principal to tenant access without relying on caller-controlled GUCs. Do not relax restrictive denial in an unapproved source change.
3. **Authorised private-staging deployment.** Only after the owner approves cloud/IAM and an independent reviewer verifies the plan, execute selected test-only integration with audit, revocation and rollback.
4. **Mount and test account context endpoints.** Verify session, CSRF, safe selection intent, idempotence, rate limiting, role policy and a durable audit; read-only view is not payment authority.
5. **Bind Personal/Business UX.** Preserve the stale-data fence, clear account-scoped caches, test concurrent tabs and reject unapproved Business roles.
6. **Activate financial services separately.** Ledger posting, FX and PAY54-to-PAY54 rails need separate approvals, reconciliation and country-specific partner contracts.

## Residual risk

Even rechecking identity after a query does not establish an atomic PostgreSQL membership snapshot, live RLS enforcement, or durable logging. Independent runtime tests remain essential, particularly for changes occurring between the last membership read and response delivery. No actual customer data was read or modified in this batch.

**Go-live conclusion:** NO-GO on existing evidence.
