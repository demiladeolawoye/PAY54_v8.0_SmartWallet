# PAY54 Engineering Batch 08 — Approved Implementation Ledger

**Date:** 2026-11-15. **Branch:** `project-titan`. **Baseline:** `d7b1389cbe1fc78f617e063318ec4948dcf9d574`.

User authorised **30 source-only implementations, 152–181**, with a single consolidated implementation report and approval checkpoint after 181. All changes must preserve existing financial posting, wallet and session behavior. No live PostgreSQL migrations, customer-data grants, credentials, Google Cloud provisioning, IAM, payments, production release or branch merges are permitted. Positive allow-read SQL tests may only use *ephemeral test-created relations and identities*, never the existing denied PAY54 role.

| Item | Engineering deliverable | Evidence path | Status |
|---|---|---|---|
| 152 | Architecture decision — DB-authenticated tenant identity and safe role boundaries | `docs/security/batch-08-db-authentication-rfc.md` | PENDING |
| 153 | Isolated PostgreSQL positive/negative role-identity RLS proof | `backend/db/tests/016_role_identity_rls_proof.sql` | PENDING |
| 154 | Adversarial RLS role-switch and forged-setting isolation tests | `backend/db/tests/017_role_identity_adversarial.sql` | PENDING |
| 155 | PostgreSQL role-switch rollback and no-live-grant invariants | `backend/db/tests/018_role_identity_rollback.sql` | PENDING |
| 156 | Disposable role-identity PostgreSQL CI workflow | `.github/workflows/pay54-account-db-identity-proof.yml` | PENDING |
| 157 | Validated immutable database principal descriptor | `backend/security/account-db-principal.mjs` | PENDING |
| 158 | Database principal spoofing and provenance regression tests | `backend/tests/account-db-principal.test.mjs` | PENDING |
| 159 | Privileged role registry inventory policy | `backend/governance/account-db-role-registry.mjs` | PENDING |
| 160 | Role registry mismatch and privilege mutation tests | `backend/tests/account-db-role-registry.test.mjs` | PENDING |
| 161 | Strict authenticated account read ticket policy | `backend/security/account-read-ticket.mjs` | PENDING |
| 162 | Read ticket expiration and substitution regression tests | `backend/tests/account-read-ticket.test.mjs` | PENDING |
| 163 | Transaction-scoped database actor verification adapter | `backend/db/account-actor-transaction.mjs` | PENDING |
| 164 | Database session actor and connection cleanup regressions | `backend/tests/account-actor-transaction.test.mjs` | PENDING |
| 165 | Read-only account decision repository | `backend/domain/account-access-decision.mjs` | PENDING |
| 166 | Business/person membership and stale identity negative tests | `backend/tests/account-access-decision.test.mjs` | PENDING |
| 167 | Multi-tenant read-only query proof adapter | `backend/db/account-tenant-read-service.mjs` | PENDING |
| 168 | Cross-tenant query-result and injection negative tests | `backend/tests/account-tenant-read-service.test.mjs` | PENDING |
| 169 | Privacy-safe decision audit orchestration | `backend/security/account-decision-audit.mjs` | PENDING |
| 170 | Audit sink outage and disclosure-denial regressions | `backend/tests/account-decision-audit.test.mjs` | PENDING |
| 171 | Account response no-cache tenant isolation policy | `backend/http/account-tenant-response.mjs` | PENDING |
| 172 | Cross-account response and payload sanitisation tests | `backend/tests/account-tenant-response.test.mjs` | PENDING |
| 173 | Session-to-actor replay-resistant read intent | `backend/security/account-db-read-intent.mjs` | PENDING |
| 174 | Read intent replay and expiry negative tests | `backend/tests/account-db-read-intent.test.mjs` | PENDING |
| 175 | Account authorisation scenario matrix | `backend/governance/account-authorisation-matrix.mjs` | PENDING |
| 176 | Authorisation matrix and role separation tests | `backend/tests/account-authorisation-matrix.test.mjs` | PENDING |
| 177 | Static SQL identity/RLS risk-gate assessor | `backend/governance/account-db-identity-safety.mjs` | PENDING |
| 178 | SQL-source weakening and grant mutation tests | `backend/tests/account-db-identity-safety.test.mjs` | PENDING |
| 179 | Unified PostgreSQL + Node source-only regression workflow | `.github/workflows/pay54-account-batch08-integration.yml` | PENDING |
| 180 | Security review and release nonactivation evidence packet | `docs/security/batch-08-security-readiness.md` | PENDING |
| 181 | Consolidated source/CI report and implementation 182 stop | `docs/engineering/batch-08-consolidated-report.md` | PENDING |

Each COMPLETE entry requires committed source and relevant passing test evidence. A disabled mode assertion is not live cloud attestation. **STOP after item 181. Implementation 182 requires fresh explicit approval.**
