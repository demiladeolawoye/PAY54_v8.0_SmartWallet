# PAY54 Engineering Batch 09 — Source-only approval ledger

**Approval:** User instructed “PLEASE PROCEED” following Batch 08 stop and proposed Batch 09; interpreted as source-only implementations **182–211**, preserving prior restrictions.  
**Date:** 2026-11-16. **Branch:** `project-titan`. **Baseline:** `3ca45625a42c71a73cde50570a31c33c23dcc4f3`.  
**Batch 08 carried forward:** Full backend regression `43773902427` confirmed **SUCCESS** before this work began.

| Item | Deliverable | Evidence | Status |
|---|---|---|---|
| 182 | Authenticated database actor threat and trust design | `docs/security/batch-09-db-actor-trust.md` | COMPLETE — 76a5627a trust design |
| 183 | Database role attribute and privilege policy | `backend/security/account-db-actor-policy.mjs` | COMPLETE — 599f7bea actor policy |
| 184 | Role privilege escalation and inheritance tests | `backend/tests/account-db-actor-policy.test.mjs` | COMPLETE — 98ff088e role escalation tests |
| 185 | Read-only PostgreSQL actor attestation query catalogue | `backend/db/account-db-attestation-query.mjs` | COMPLETE — 1c9fffeb attestation SQL |
| 186 | Actor attestation SQL shape regression tests | `backend/tests/account-db-attestation-query.test.mjs` | COMPLETE — 5fbfaa6f attestation tests |
| 187 | Per-connection actor provenance guard | `backend/db/account-connection-provenance.mjs` | COMPLETE — e1e2a10c; ee8f8ebf external evidence hardening |
| 188 | Session/current user mismatch and BYPASSRLS tests | `backend/tests/account-connection-provenance.test.mjs` | COMPLETE — d66a8546; a29ab58a; ead53cb6; 947137ff regression corrections |
| 189 | Pool connection quarantine contract | `backend/db/account-pool-quarantine.mjs` | COMPLETE — e1dcc786 pool quarantine |
| 190 | Connection discard and reentrancy tests | `backend/tests/account-pool-quarantine.test.mjs` | COMPLETE — b8bf2c77 concurrent client tests |
| 191 | Short-lived account-access authorization lease | `backend/security/account-read-lease.mjs` | COMPLETE — 8bff0750 one-use lease |
| 192 | Lease expiry, revocation and replay regressions | `backend/tests/account-read-lease.test.mjs` | COMPLETE — 99f2d578 lease replay tests |
| 193 | Current membership snapshot validation | `backend/domain/account-current-membership.mjs` | COMPLETE — 2d4bb7f0 current membership |
| 194 | Stale and cross-tenant membership negative tests | `backend/tests/account-current-membership.test.mjs` | COMPLETE — 2acefbb1 tenant and stale membership tests |
| 195 | Disposable PostgreSQL positive and negative tenant-reader proof | `backend/db/tests/019_account_role_acl_proof.sql` | COMPLETE — 8c9a871f SQL own-tenant proof |
| 196 | Adversarial role inheritance and current_setting SQL proof | `backend/db/tests/020_account_role_acl_adversarial.sql` | COMPLETE — 2ae6d569 SQL spoof proof |
| 197 | Database test rollback and zero-grant proof | `backend/db/tests/021_account_role_acl_rollback.sql` | COMPLETE — c3a25e4d SQL rollback assertion |
| 198 | Ephemeral PostgreSQL actor ACL CI workflow | `.github/workflows/pay54-account-actor-acl-proof.yml` | COMPLETE — 0737bfd8 SQL actor CI |
| 199 | Privacy-safe fail-closed audit handoff | `backend/security/account-read-audit-gate.mjs` | COMPLETE — ea1ed2b9 audit-first gate |
| 200 | Audit acknowledgment and error-disclosure tests | `backend/tests/account-read-audit-gate.test.mjs` | COMPLETE — 659e95a5 audit outage tests |
| 201 | Post-read revocation recheck boundary | `backend/security/account-post-read-revocation.mjs` | COMPLETE — b4d18561 post-read revocation |
| 202 | Revocation race and outage tests | `backend/tests/account-post-read-revocation.test.mjs` | COMPLETE — 9fd3fd5a revocation race tests |
| 203 | Account error disclosure redaction contract | `backend/http/account-error-boundary.mjs` | COMPLETE — 8005cf55 no-cache error projector |
| 204 | Error normalization and non-enumeration tests | `backend/tests/account-error-boundary.test.mjs` | COMPLETE — ab200e4d response privacy tests |
| 205 | Account identity, lease and audit integration regression | `backend/tests/account-batch09-integration.test.mjs` | COMPLETE — 0f649cf4; 627d9cda integration regression |
| 206 | Offline actor and migration source safety gate | `backend/governance/account-batch09-source-audit.mjs` | COMPLETE — ff47f741 source security audit |
| 207 | Source mutation and grant regression tests | `backend/tests/account-batch09-source-audit.test.mjs` | COMPLETE — f5c91454 security mutation tests |
| 208 | Combined PostgreSQL and Node source-only CI | `.github/workflows/pay54-account-batch09-integration.yml` | COMPLETE — 1ec7f61c; GitHub run 43842199471 SUCCESS |
| 209 | Independent security threat and controls review | `docs/security/batch-09-independent-review.md` | COMPLETE — cb5c2b40 independent review |
| 210 | Unchanged release and compliance boundary evidence | `docs/engineering/batch-09-release-evidence.md` | COMPLETE — e005fdc0 release evidence |
| 211 | Batch 09 consolidated report and item 212 stop | `docs/engineering/batch-09-consolidated-report.md` | COMPLETE — 735ab79b report; 4f062cae full regression update |

**Non-negotiable boundaries:** No live PostgreSQL credentials, policy/grant migration, cloud provisioning, IAM changes, production/staging release, money execution, provider activation or customer-data access. Disposable PostgreSQL exercises test-owned roles and tables only. Existing ledger and account features preserved. Complete each meaningful source/testing deliverable with commit and CI evidence, and report unresolved security risks. **STOP at item 211; item 212 needs fresh explicit user approval.**

## Verified Batch 09 closure

**30/30 source-only deliverables COMPLETE.** Consolidated report: `docs/engineering/batch-09-consolidated-report.md`, amended at commit `4f062caee3318a1cdbbc303c5cc22bf67ecc3387`. All three relevant final GitHub Actions workflows ran against source commit `947137ffe24edf76edcb89a21b6f8f981bc93141` and passed:

- PAY54 Batch 09 Account Actor and RLS Integration `43842199471` — **SUCCESS**.
- PAY54 Account Boundary Tests `43842199480` — **SUCCESS**.
- PAY54 Backend Tests `43842199353` — **SUCCESS**.

Intermediate failed test runs are retained and detailed in the consolidated report. The old account deny-only RLS and unassigned NOLOGIN role remain unchanged; SQL actor proofs use test-only roles and relations. This is a source-only outcome, **not** a live security attestation.

**STOP at 211. Implementation 212 NOT STARTED; requires fresh explicit user approval.** Cloud provisioning and financial execution remain disabled, staging/production release blocked.
