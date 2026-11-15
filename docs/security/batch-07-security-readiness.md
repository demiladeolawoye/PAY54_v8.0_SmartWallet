# PAY54 Enterprise Security — Batch 07 Readiness & Independent Review Packet

**Date:** 2026-11-15  
**Branch:** `project-titan`  
**Source-only scope:** Implementations 122–150; no runtime promotion or customer account activation.

## Engineering outcome

The Batch 07 source changes strengthen account identity and access boundaries without granting customer-data access. The existing `pay54_account_reader_role` remains NOLOGIN, unassigned and denied SELECT on account, wallet and ledger data. Migration 013 retains restrictive false RLS policies; no new migration, customer permission, PostgreSQL login or production credential was introduced.

New source modules and tests cover:

- Role inventory inspection with explicit rejection of LOGIN, BYPASSRLS, privilege inheritance, role membership and unauthorised data grants.
- Server-verified opaque principal binding to canonical parameterised read-only account queries.
- Fresh revocation checks and a one-use session replay callback contract. Neither implements a production session backend.
- Active account/membership validation and cross-business exclusion, with legacy Personal wallet isolation unchanged.
- PostgreSQL 16 negative cross-tenant SQL tests. Temporary SELECT grants and synthetic tenant rows exist **only inside a disposable CI transaction that is rolled back**.
- Non-PII audit envelope, request identity envelope, defensive request scope and PostgreSQL RLS metadata inspection.
- Offline source-safety invariants and mutation tests for deny-only policies, financial privilege exclusions and no-deploy restrictions.
- Integrated account identity, account request, audit, RLS and regression CI workflows.

## Independently unverified operating controls

| Control | Status | Next gate |
|---|---|---|
| Production PostgreSQL least-privilege account login | NOT CONFIGURED | Security review of credential and role design |
| Authenticated tenant RLS | DENY ONLY | Independently approved server-bound identity mechanism and policy tests |
| Session revocation/replay | CONTRACT ONLY | Durable atomic store and operational failure testing |
| Account API and Personal/Business switcher | NOT MOUNTED | Separately authorised UX/backend integration |
| Audit pipeline | CONTRACT ONLY | Durable, tamper-evident storage, retention and privacy review |
| Customer KYC/KYB and payment provider authorisation | NOT ENABLED | Regulatory and partner approvals |
| Financial operation | DISABLED | Independent fintech security/reconciliation sign-off |
| Cloud infrastructure provisioning | DISABLED | STG-05 and other release governance |
| Staging/production release | BLOCKED | Independently documented release approvals |

## Risks and acceptance criteria

**Identity impersonation:** Browser-provided account IDs, IP headers, custom PostgreSQL session variables and the account selection preview must never become authentication sources. The authenticated principal must originate from an independently trusted signed and revocation-checked session.

**Connection-pool isolation:** Source-only read transactions do not prove that a production database identity cannot leak across pooled connections. Real-role security, transaction state reset, cancellation, TLS and role provenance need integration/penetration testing.

**Audit availability:** An audit envelope or sink callback alone is not durable audit delivery. The application must prove correct failure handling, alerting, retention and access segregation.

**Account isolation:** Negative RLS tests currently prove *deny-all* policies and do not prove working positive authorised reads for any tenant. Actual Personal/Business data reads require a separate policy design and security sign-off.

**Engineering verification:** Review exact GitHub Actions results in the consolidated report. Source-only passing CI is not live platform attestation. Superseded or failed intermediate runs must be recorded.

## Explicit exclusions

No production/cloud resources, live database migrations, IAM, credentials, provider activation, financial execution, new ledger posting functions, hosted account login, account switching or money movement were changed.

**Release decision:** BLOCKED. **Independent security sign-off:** OUTSTANDING. **Implementation 152:** MUST NOT START without fresh user approval.
