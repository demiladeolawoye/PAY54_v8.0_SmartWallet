# PAY54 Engineering Batch 09 — Source-only approval ledger

**Approval:** User instructed “PLEASE PROCEED” following Batch 08 stop and proposed Batch 09; interpreted as source-only implementations **182–211**, preserving prior restrictions.  
**Date:** 2026-11-16. **Branch:** `project-titan`. **Baseline:** `3ca45625a42c71a73cde50570a31c33c23dcc4f3`.  
**Batch 08 carried forward:** Full backend regression `43773902427` confirmed **SUCCESS** before this work began.

| Item | Deliverable | Evidence | Status |
|---|---|---|---|
| 182 | Authenticated database actor threat and trust design | `docs/security/batch-09-db-actor-trust.md` | PENDING |
| 183 | Database role attribute and privilege policy | `backend/security/account-db-actor-policy.mjs` | PENDING |
| 184 | Role privilege escalation and inheritance tests | `backend/tests/account-db-actor-policy.test.mjs` | PENDING |
| 185 | Read-only PostgreSQL actor attestation query catalogue | `backend/db/account-db-attestation-query.mjs` | PENDING |
| 186 | Actor attestation SQL shape regression tests | `backend/tests/account-db-attestation-query.test.mjs` | PENDING |
| 187 | Per-connection actor provenance guard | `backend/db/account-connection-provenance.mjs` | PENDING |
| 188 | Session/current user mismatch and BYPASSRLS tests | `backend/tests/account-connection-provenance.test.mjs` | PENDING |
| 189 | Pool connection quarantine contract | `backend/db/account-pool-quarantine.mjs` | PENDING |
| 190 | Connection discard and reentrancy tests | `backend/tests/account-pool-quarantine.test.mjs` | PENDING |
| 191 | Short-lived account-access authorization lease | `backend/security/account-read-lease.mjs` | PENDING |
| 192 | Lease expiry, revocation and replay regressions | `backend/tests/account-read-lease.test.mjs` | PENDING |
| 193 | Current membership snapshot validation | `backend/domain/account-current-membership.mjs` | PENDING |
| 194 | Stale and cross-tenant membership negative tests | `backend/tests/account-current-membership.test.mjs` | PENDING |
| 195 | Disposable PostgreSQL positive and negative tenant-reader proof | `backend/db/tests/019_account_role_acl_proof.sql` | PENDING |
| 196 | Adversarial role inheritance and current_setting SQL proof | `backend/db/tests/020_account_role_acl_adversarial.sql` | PENDING |
| 197 | Database test rollback and zero-grant proof | `backend/db/tests/021_account_role_acl_rollback.sql` | PENDING |
| 198 | Ephemeral PostgreSQL actor ACL CI workflow | `.github/workflows/pay54-account-actor-acl-proof.yml` | PENDING |
| 199 | Privacy-safe fail-closed audit handoff | `backend/security/account-read-audit-gate.mjs` | PENDING |
| 200 | Audit acknowledgment and error-disclosure tests | `backend/tests/account-read-audit-gate.test.mjs` | PENDING |
| 201 | Post-read revocation recheck boundary | `backend/security/account-post-read-revocation.mjs` | PENDING |
| 202 | Revocation race and outage tests | `backend/tests/account-post-read-revocation.test.mjs` | PENDING |
| 203 | Account error disclosure redaction contract | `backend/http/account-error-boundary.mjs` | PENDING |
| 204 | Error normalization and non-enumeration tests | `backend/tests/account-error-boundary.test.mjs` | PENDING |
| 205 | Account identity, lease and audit integration regression | `backend/tests/account-batch09-integration.test.mjs` | PENDING |
| 206 | Offline actor and migration source safety gate | `backend/governance/account-batch09-source-audit.mjs` | PENDING |
| 207 | Source mutation and grant regression tests | `backend/tests/account-batch09-source-audit.test.mjs` | PENDING |
| 208 | Combined PostgreSQL and Node source-only CI | `.github/workflows/pay54-account-batch09-integration.yml` | PENDING |
| 209 | Independent security threat and controls review | `docs/security/batch-09-independent-review.md` | PENDING |
| 210 | Unchanged release and compliance boundary evidence | `docs/engineering/batch-09-release-evidence.md` | PENDING |
| 211 | Batch 09 consolidated report and item 212 stop | `docs/engineering/batch-09-consolidated-report.md` | PENDING |

**Non-negotiable boundaries:** No live PostgreSQL credentials, policy/grant migration, cloud provisioning, IAM changes, production/staging release, money execution, provider activation or customer-data access. Disposable PostgreSQL exercises test-owned roles and tables only. Existing ledger and account features preserved. Complete each meaningful source/testing deliverable with commit and CI evidence, and report unresolved security risks. **STOP at item 211; item 212 needs fresh explicit user approval.**
