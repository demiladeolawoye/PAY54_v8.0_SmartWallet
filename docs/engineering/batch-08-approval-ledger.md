# PAY54 Engineering Batch 08 — Approved Implementation Ledger

**Date:** 2026-11-15. **Branch:** `project-titan`. **Baseline:** `d7b1389cbe1fc78f617e063318ec4948dcf9d574`.

User authorised **30 source-only implementations, 152–181**, with a single consolidated implementation report and approval checkpoint after 181. All changes must preserve existing financial posting, wallet and session behavior. No live PostgreSQL migrations, customer-data grants, credentials, Google Cloud provisioning, IAM, payments, production release or branch merges are permitted. Positive allow-read SQL tests may only use *ephemeral test-created relations and identities*, never the existing denied PAY54 role.

| Item | Engineering deliverable | Evidence path | Status |
|---|---|---|---|
| 152 | Architecture decision — DB-authenticated tenant identity and safe role boundaries | `docs/security/batch-08-db-authentication-rfc.md` | SOURCE COMPLETE — db697ce6 — DB-authenticated tenant identity RFC |
| 153 | Isolated PostgreSQL positive/negative role-identity RLS proof | `backend/db/tests/016_role_identity_rls_proof.sql` | SOURCE COMPLETE — ed1675f0 — role-identity positive/negative RLS proof |
| 154 | Adversarial RLS role-switch and forged-setting isolation tests | `backend/db/tests/017_role_identity_adversarial.sql` | SOURCE COMPLETE — b1e56270 — forged GUC adversarial SQL |
| 155 | PostgreSQL role-switch rollback and no-live-grant invariants | `backend/db/tests/018_role_identity_rollback.sql` | SOURCE COMPLETE — 9232cfc0 — role and SQL rollback assertions |
| 156 | Disposable role-identity PostgreSQL CI workflow | `.github/workflows/pay54-account-db-identity-proof.yml` | SOURCE COMPLETE — 8aacc4f3 — isolated PostgreSQL run 43773351519 SUCCESS |
| 157 | Validated immutable database principal descriptor | `backend/security/account-db-principal.mjs` | SOURCE COMPLETE — e10cc9d1 — opaque verified DB principal descriptor |
| 158 | Database principal spoofing and provenance regression tests | `backend/tests/account-db-principal.test.mjs` | SOURCE COMPLETE — c7c29c5a — forged descriptor regression |
| 159 | Privileged role registry inventory policy | `backend/governance/account-db-role-registry.mjs` | SOURCE COMPLETE — 0adff186 — immutable actor-role registry |
| 160 | Role registry mismatch and privilege mutation tests | `backend/tests/account-db-role-registry.test.mjs` | SOURCE COMPLETE — aa66c537 — duplicate/elevated actor denial tests |
| 161 | Strict authenticated account read ticket policy | `backend/security/account-read-ticket.mjs` | SOURCE COMPLETE — 65bddced — one-use account read ticket |
| 162 | Read ticket expiration and substitution regression tests | `backend/tests/account-read-ticket.test.mjs` | SOURCE COMPLETE — eb279087 — ticket replay and expiry tests |
| 163 | Transaction-scoped database actor verification adapter | `backend/db/account-actor-transaction.mjs` | SOURCE COMPLETE — 26d4924d — current_user read-only actor transaction |
| 164 | Database session actor and connection cleanup regressions | `backend/tests/account-actor-transaction.test.mjs` | SOURCE COMPLETE — 505a022c — actor mismatch/pool failure regression |
| 165 | Read-only account decision repository | `backend/domain/account-access-decision.mjs` | SOURCE COMPLETE — 8bf8966c — account membership row decision |
| 166 | Business/person membership and stale identity negative tests | `backend/tests/account-access-decision.test.mjs` | SOURCE COMPLETE — bf445dfd — cross-tenant/revoked account tests |
| 167 | Multi-tenant read-only query proof adapter | `backend/db/account-tenant-read-service.mjs` | SOURCE COMPLETE — 40d0745f — account-label read service |
| 168 | Cross-tenant query-result and injection negative tests | `backend/tests/account-tenant-read-service.test.mjs` | SOURCE COMPLETE — 88f9d7cf — duplicate/cross-tenant/wallet route negative tests |
| 169 | Privacy-safe decision audit orchestration | `backend/security/account-decision-audit.mjs` | SOURCE COMPLETE — dea92d5a — audit-before-disclosure |
| 170 | Audit sink outage and disclosure-denial regressions | `backend/tests/account-decision-audit.test.mjs` | SOURCE COMPLETE — 83ca7ee5 — audit failure and PII tests |
| 171 | Account response no-cache tenant isolation policy | `backend/http/account-tenant-response.mjs` | SOURCE COMPLETE — ba5db91c — strict no-store display response |
| 172 | Cross-account response and payload sanitisation tests | `backend/tests/account-tenant-response.test.mjs` | SOURCE COMPLETE — a9fb5169 — response leakage regression |
| 173 | Session-to-actor replay-resistant read intent | `backend/security/account-db-read-intent.mjs` | SOURCE COMPLETE — 277cd0a0 — actor-bound atomic read intent |
| 174 | Read intent replay and expiry negative tests | `backend/tests/account-db-read-intent.test.mjs` | SOURCE COMPLETE — 69e0f53b — replay/invalid request tests |
| 175 | Account authorisation scenario matrix | `backend/governance/account-authorisation-matrix.mjs` | SOURCE COMPLETE — 4e78949c — account permission matrix |
| 176 | Authorisation matrix and role separation tests | `backend/tests/account-authorisation-matrix.test.mjs` | SOURCE COMPLETE — ff060692 — role, revocation and no-money tests |
| 177 | Static SQL identity/RLS risk-gate assessor | `backend/governance/account-db-identity-safety.mjs` | SOURCE COMPLETE — 3fcd5ac9 — source/RLS safety auditor |
| 178 | SQL-source weakening and grant mutation tests | `backend/tests/account-db-identity-safety.test.mjs` | SOURCE COMPLETE — 6c20d329 — source mutation tests |
| 179 | Unified PostgreSQL + Node source-only regression workflow | `.github/workflows/pay54-account-batch08-integration.yml` | SOURCE COMPLETE — 9c3f8099 — integrated CI 43773942035 SUCCESS |
| 180 | Security review and release nonactivation evidence packet | `docs/security/batch-08-security-readiness.md` | SOURCE COMPLETE — dfab0d73 — independent security-readiness packet |
| 181 | Consolidated source/CI report and implementation 182 stop | `docs/engineering/batch-08-consolidated-report.md` | SOURCE COMPLETE — dc536570 — consolidated report; full backend run 43773902427 pending |

Each COMPLETE entry requires committed source and relevant passing test evidence. A disabled mode assertion is not live cloud attestation. **STOP after item 181. Implementation 182 requires fresh explicit approval.**

## Closure and verification

**30/30 source-only deliverables committed.** The consolidated report is at `docs/engineering/batch-08-consolidated-report.md`, commit `dc5365709309859c60b731f4213e7fd1bfe819fe`.

Verified successful GitHub Actions: isolated actor RLS proof `43773351519`; focused account boundary regressions `43773902415`; integrated PostgreSQL 16 and Node account-security CI `43773942035`.

**Open:** Full PAY54 Backend Tests workflow `43773902427` remains **PENDING** at closure, and is **not** counted as passed. Broad zero-regression verification remains conditional on its completion. The integrated account regression suite has passed.

**STOP at 181:** Implementation 182 has NOT started and needs fresh approval. Live customer DB roles/grants, production RLS access, cloud provisioning, IAM, payments and staging/production release remain unapproved/disabled.
