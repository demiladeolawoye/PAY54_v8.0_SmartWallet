# PAY54 CTO — Batch 26 Founder Status, Engineering Ledger and Change Register

**Batch:** 26, implementations **1018–1067** (50 numbered code, test, CI and review deliverables).
**Review branch:** `cto/batch26-pages-proof-staging-readiness-1018-1067`
**GitHub review:** Draft PR #14, stacked on unmerged Draft PR #13.
**Operational status:** Production NO-GO; no staging/customer login/Pages deployment/card/settlement/IAM activation.
**Final CI:** Must be checked on the exact final SHA of this register and closure; a prior green SHA is not sufficient.

## Batch 26 source engineering actions

| IDs | Action / delivered file family | Source-state boundary |
| --- | --- | --- |
| 1018–1019 | GitHub Pages deployment metadata model + forgery/URL/SHA tests | GitHub Pages API authentication not proved |
| 1020–1021 | Artifact SHA256 manifest comparison + content/hash traversal tests | Observed candidate bytes are not confirmed remote bytes |
| 1022–1023 | Public HTTP HEAD response triage + SPA fallback/error negative tests | 200 does not confirm leak; 404 does not prove future safety |
| 1024 | New pinned read-only Batch26 CI with previous security tests | No cloud credentials, financial execution or site publishing |
| 1025–1026 | Ed25519 reviewer-signed Pages evidence + signature/freshness tests | Signing does not authenticate the physical observation |
| 1027–1028 | Pages metadata + manifest + reviewer proof chain and fail-closed tests | Structural evidence, still needs live authenticated source |
| 1029–1030 | Restricted DNS/HTTPS binding evidence + unsupported-domain tests | DNS/TLS live status independently unverified |
| 1031–1032 | Protected GitHub environment reviewer/OIDC source policy + denial tests | Actual settings, IAM and reviewer identity unverified |
| 1033–1034 | Security incident classification with tracked ticket + suspect/confirmed separation | No incident declared solely from synthetic 200 response |
| 1035–1036 | Known-good website rollback plan + missing/duplicate SHA negative tests | Actual rollback drill still outstanding |
| 1037–1038 | Ed25519 identity key rollover window + private key/expiry tests | No real contracted IdP activated |
| 1039–1040 | Staging source/image/20-migration lineage + drift denial tests | Real image and DB schema have not been inspected |
| 1041–1042 | Staging PostgreSQL server-name/TLS intent and negative tests | Actual server certificate not obtained |
| 1043–1044 | Retained financial/account HTTP 503 source and real loopback denial tests | No public account/payment endpoint enabled |
| 1045–1046 | Two distinct Nigeria payout failover/idempotency source policy and tests | No provider redundancy or settlement acceptance proven |
| 1047–1048 | Source-author, release, Security, Compliance and reviewers separation with spoof denial | GitHub reviewer identity not independently authenticated |
| 1049–1050 | Reconciled actual P0 source blockers from Batch25 and forged-closure regression | All P0s remain operationally open |
| 1051–1055 | Pages threat model; live Pages evidence process; artifact attestation; website rollback; identity integration contract | Operational runbooks, not executed actions |
| 1056–1060 | Four-role DB; protected deployer; UK–Nigeria rails; development card quarantine; privacy/security review | Human, legal and actual cloud acceptance missing |
| 1061–1064 | Device QA, performance/SRE acceptance, independent reviewer matrix and dependency cutover | QA, operational SLA and integration evidence missing |
| 1065 | Tightened exact-source Batch26 CI for actual root/card blockers, SQL and HTTP denial | Tests required on final exact SHA |
| 1066–1067 | This founder change register and Batch26 source closure | No deploy authority |

**Engineering accounting:** source implementations include modules, regression tests, CI rules and governance procedures; they are **not 50 production-banking features**.

## Current programme status — source versus actual operations

| Area | Source-engineering position | Remaining real-world task | Priority |
| --- | --- | --- | --- |
| Platform architecture, wallet and ledger | Canonical modules, ledger boundaries, adversarial tests and source contracts | Independently deployed, reconciled double-entry financial operations, observability | P0 |
| Account context and sessions | Directory, RLS, signed access, unique JTI, bootstrap, initial binding, rotation with SQL/test layers | Contracted live IdP, effective staging DB roles, MFA, live server route, multi-device isolation | P0 |
| Public website | Existing dashboard, static checks, repo-root/publication guards and evidence triage | Authenticated Pages settings, actual published artifact and historic exposure analysis, safe containment | P0 |
| Linked-card funding | Development provider, funding engine and gating/acceptance contracts | Contracted PSP/issuer, no public development simulator, PCI/3DS/refunds/reconciliation QA | P0 |
| Hosting and release | Draft source PRs, CI, release-source/OIDC and rollback policy | Protected GitHub deployer account, environment reviewers, live cloud IAM, rollback drill | P0 |
| PostgreSQL staging | 001–020 migrations, four isolated pool configs, SQL role/RLS source tests | Private staging cluster, secret manager, TLS, PITR, actual grants and independent RLS pentest | P0 |
| UK–Nigeria launch | Provider orchestration, four-role rail readiness, two Nigeria payout source contract | Signed UK inbound, global FX backbone, two Nigerian payouts; AML/KYC/KYB/safeguarding | P0 |
| UI/mobile QA | Source tests and visual/offline review assets | Android/iOS/web functional/accessibility/tenant tests on real backend | P1 |
| Performance/SRE | Metrics, incident and performance acceptance plans | Real staging SLO, fraud telemetry, failover and recovery rehearsal | P1 |
| Documentation/governance | Founder register, release matrix and source audit | Independent signed operational reviews and actual evidence | P1 |

## Change request register and decision

| ID | Severity | Owner | Current state | Next acceptance item |
| --- | --- | --- | --- | --- |
| CR-PAGES-01 | P0 | Security/DevSecOps | OPEN | Verify actual Pages artifact/settings and contain if needed |
| CR-CARD-01 | P0 | Fintech/Frontend | OPEN | Choose contracted PSP and make simulator unreachable in production financial UI |
| CR-DEPLOY-01 | P0 | Release/DevSecOps | OPEN | Protected deployer GitHub identity/OIDC/env/rollback |
| CR-IDENTITY-01 | P0 | Backend/Security/Founder | UNPROVISIONED | Contract IdP, stage MFA, secure signed access assertions |
| CR-DB-01 | P0 | DBA/DevSecOps | UNDEPLOYED | Staged PostgreSQL 001–020, four actual roles/RLS/PITR |
| CR-RATE-01 | P0 | Security/SRE | UNCONNECTED | Distributed atomic authentication limiter |
| CR-ACCOUNT-02 | P0 | Backend/Mobile | HTTP 503 | Verified real identity+session account APIs, no cross-tenant leakage |
| CR-FINTECH-01 | P0 | Founder/Compliance | OPEN | Sign UK–Nigeria partners, safeguarding/AML/FX/settlement |
| CR-QA-01 | P1 | QA/Mobile/UX | PENDING | Real device, cache partitioning and WCAG 2.2 AA tests |
| CR-OBS-01 | P1 | Security/SRE | PENDING | Security audit, incident and recovery/live-performance evidence |

## CTO priority order

**Next operational work:** (1) authenticate/contain current Pages, (2) protected GitHub deployer & environments, (3) controlled PostgreSQL/identity staging, (4) contracted PSP and UK–Nigeria rails, (5) real account/mobile/financial QA and regulatory release review.

**Next recommended numbered source cycle:** Batch 27 (1068–1117), to implement approved observable staging/Pages evidence intake, source-to-runtime trace, post-release rollback checks and any verified partner requirements, without redundant new abstractions. Prefer closing actual P0 controls over indefinite source-only work.

**Status discipline:** Source CI may be green; production remains NO-GO until the above operational evidence is independently signed.
