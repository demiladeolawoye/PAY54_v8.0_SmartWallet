# PAY54 CTO — Batch 22 Founder Register and Change Requests

**Batch:** 22, implementations 818–867 (50 numbered source engineering actions)
**Review:** Draft PR #10, stacked on unmerged PR #9
**Release:** NO-GO. Account endpoints remain HTTP 503. No public Pages change or financial execution.
**Verification:** exact-head status must be recorded after the last commit; superseded cancelled workflows are not counted.

## Source implementation and correction register

| Scope | Committed engineering outcome | Acceptance boundary |
| --- | --- | --- |
| 818–823 | Initial PostgreSQL schema/adapter/session proposals, negative tests and draft PR | Early competing account-table migrations were superseded and deleted after conflict discovery; never apply them |
| 824–827 | Actual PostgreSQL catalogue check for FORCE RLS, restricted role and no DML; integrated with both adapters | Catalogue proof runs in the same restricted transaction, but is not a substitute for tenant negative tests |
| 828–830 | Two-pool authenticated directory composition, cross-boundary regression, source-security CI | No live pools or account HTTP route |
| 831–832 | Disposable PostgreSQL tenant/RLS tests, dedicated integration workflow | Synthetic database only |
| 833–837 | Expired/revoked session and account/member lifecycle SQL regression | Canonical schema reconciled; source-only |
| 838–840 | Role/owner integrity design and tests | Existing migration 008 owner/role triggers retained; duplicate role trigger removed |
| 841–844 | Session/account integrity and append-only audit designs and regression | Canonical additive migrations 014–016; audit writer not enabled |
| 845–849 | Dedicated inert account-directory role and original canonical schema/reader reconciliation | Additive migration 017; original migration 013 restrictive denial intact |
| 850–852 | Fixed failure injection after canonical SQL query change; explicitly ordered existing+additive migrations and isolated new fixtures | No migration was run against a customer database |
| 853–859 | Additional real SQL tests for deny-only legacy role, inert roles, no ledger access, transaction-local actor/credential and malformed identities | Disposable PostgreSQL proof; cannot authorise production |
| 860–863 | Automated migration compatibility guard, adversarial tests, expanded CI watchers and digest-pinned PostgreSQL CI image | No release token or cloud permission |
| 864–865 | Architecture ADR and connection rollback-discard/secret-redaction regressions | Actual identity provider, restricted login binding and persisted session lifecycle pending |
| 866–867 | Founder register, final source closure and 50-item reconciliation | Still requires exact-head CI and independent production acceptance |

**Engineering accounting rule:** the numbered steps include corrective work and regression additions, not 50 separate customer-visible product features. Removed duplicate schema changes are NOT counted as deployed deliverables.

## Unresolved change requests and operational gates

| ID | Priority | Requirement | Owner / required evidence | Status |
| --- | --- | --- | --- | --- |
| CR-ACCOUNT-02 | P0 | Real Personal/Business switch, trusted tenant session and atomic replay-proof rebind | Backend/Security; provisioned identity, PostgreSQL role-to-login grants, CAS, CSRF, old-session revocation, audit commit and negative live tests | BLOCKED |
| CR-DB-01 | P0 | Approve and apply canonical 001–013 + additive 014–017 in correctly controlled environment | DBA/DevSecOps; migration backup, migration ownership, least-privileged PG login and full access review | NOT PROVISIONED |
| CR-RLS-01 | P0 | Prove real tenant RLS isolation without synthetic credentials | Security/QA; two live staging principals, viewer/operator boundary, privilege escalation and rollback cases | NOT VERIFIED |
| CR-PAGES-01 | P0 | Historical Pages artifact overpacking and current public exposure | DevSecOps/Security; verify active deployment, exact public URLs, file sensitivity, containment and rollback | OPEN |
| CR-CARD-01 | P0 | Linked-card development-provider reference and real card infrastructure | Fintech Architect/Frontend; approved provider or separately approved disabled mode with funding regression proof | OPEN |
| CR-DEPLOY-01 | P0 | GitHub protected deployment identity, ruleset, OIDC and independent rollback | Release/DevSecOps; branch protections, deployer IAM, least-privileged secrets and restore evidence | OPEN |
| CR-FINTECH-01 | P0 | UK–Nigeria licensed provider, safeguarding and regulated money rails | Compliance/Fintech; contracts, KYC/KYB, AML/sanctions, reconciliation, incident plan | OPEN |
| CR-QA-01 | P1 | Real devices and authenticated regression of session/ledger/cards | QA/UI; Android/iOS/mobile/desktop, network races, accessibility, balances, wallet and role isolation | PENDING |
| CR-OBS-01 | P1 | Operational audit, redacted trace and monitoring controls | Security/SRE; durable audit writer, service alerts, incident response and data retention | PENDING |

## Immediate governance decision

1. Leave PR #10 DRAFT and unmerged. Continue the 50-item source review cycle only after exact-head CI is green.
2. Do not attach an actual LOGIN user to any new NOLOGIN role before Security/DBA approval.
3. Do not expose `/v1/accounts`, `/v1/account-context/*` or money endpoints while session and financial dependencies are unprovisioned.
4. Do not infer production readiness from disposable PostgreSQL tests, GitHub badges, source counts or static access checks.
5. Resolve the Pages exposure investigation and protected-deployer controls before website release decisions.

**CTO disposition:** Batch 22 source work is reviewable; production remains NO-GO.
