<!-- PAY54 Batch 27 / 1185 -->
# PAY54 CTO — Batch 27 Founder Implementation, Operational Task and Change Register

**Founder authorisation:** Raise approval interval from 50 to **at most 120 auditable engineering actions** per batch, subject to three 40-action regression checkpoints. Stop early rather than invent implementations. No additional approval required between checkpoints for source-only work already within approved engineering scope.

**Batch:** 27, actions 1068–1187.
**GitHub:** Draft PR #15 `cto/batch27-operational-evidence-1068-1187`, stacked on Batch 26 Draft PR #14.
**Actual release state:** **Production NO-GO**. No live GitHub Pages modification, cloud IAM/roles, customer database migration, identity login, card PSP connection, wallet/ledger posting or FX settlement was authorised or performed.
**Verification:** Final exact-commit CI must pass before source closure is reported as regression-verified.

## Actions and deliverables — the 120-action engineering ledger

| Actions | Delivered source work | Independent operational gap |
| --- | --- | --- |
| 1068–1076 | Pages Settings/deployment observation, static artifact SHA-256 checks, private-source response triage, strict Pages attestation, new source-only CI | Actual Pages API/public artifact independently unverified |
| 1077–1086 | Protected OIDC/branch/role evidence, safe operator JSON ingestion and redacted reporting | No effective cloud/DB permissions verified |
| 1087–1094 | Composed Pages evidence, staging prerequisite/status workflow, UK–Nigeria partner signoffs | IdP/DB/regulated providers not provisioned |
| 1095–1102 | Card/PSP production boundary, account route activation, migration/rollback evidence | Current development card provider remains, account routes 503 |
| 1103–1107 | Fixed-endpoint bounded **read-only GitHub API collector** and protected operator CLI; Checkpoint A runbook | Authorised operator must independently collect real GitHub Pages settings |
| 1108–1115 | Static dependency/source-map detection, read-only four-role Postgres catalogue query, bounded public STATIC GET file hashing and reviewed manifest comparison | Real public bytes and live staging database not yet observed |
| 1116–1123 | Deployer IAM scope, contract-effective-date guard, historical Git path audit and redacted public audit path classification | External IAM/contract facts remain unverified |
| 1124–1131 | Restricted incident retention, OIDC identity binding, Pages settings change detection, CSP/HSTS reporting | No live incident audit or headers independently witnessed |
| 1132–1139 | Read-only forced RLS catalogue probe, rollback evidence, SECURITY DEFINER owner probe and IdP Ed25519 SPKI key fingerprint | Real Postgres roles/IdP key ownership and RLS pentest unverified |
| 1140–1147 | Separation of source/Security/DBA/Release/Compliance reviewers, static manifest privacy, tracked-file action accounting and Checkpoint B | Reviewers require actual cryptographic identity and external signoff |
| 1148–1155 | GitHub environment/rulesets/Actions runs/Pages artifacts metadata observation | No effective GitHub protection or published artifact authorisation confirmed |
| 1156–1163 | Append-only session audit evidence, double-entry minor-unit conservation, secret rotation and ten-domain account cache segregation | No live ledger, KMS, actual customer session or device QA |
| 1164–1171 | MFA challenge, session rotation/audit, webhook replay, FX quote expiry/precision | Contracted provider execution and security proof pending |
| 1172–1179 | Nigerian payout idempotency, refund/chargeback conservation, AML sanctions hold and real-device account isolation | Contracted bank rails, safeguarding and real-device tests pending |
| 1180–1187 | Website rollback must not mutate ledger; six-office release evidence, final CI/ledger and founder closure report | No staging/production release or approvals performed |

**Accounting:** Every number represents a tracked code/test/workflow/document change. These are **not 120 new customer-facing payment features**, and no task is marked deployed merely because source CI passes.

## PAY54 operational workstream dashboard

| Workstream | Source engineering state | Operational acceptance | Primary blocker |
| --- | --- | --- | --- |
| Core wallet + ledger | Canonical double-entry/security boundaries and financial tests | **BLOCKED** | Live safeguarding, provider settlement/reconciliation and account-level funds ownership |
| Personal and Business accounts | Server-issued session, RLS, signed identity assertion, initial binding and rotation source | **BLOCKED** | Actual trusted IdP, MFA, four roles, live endpoints, multi-device QA |
| Fintech payments / FX | Provider abstraction, idempotency/replay and FX evidence contracts | **BLOCKED** | Executed UK inbound/global backbone and two Nigerian payout routes |
| Linked/virtual cards | Development cards/funding UI preserved; PSP gate source | **BLOCKED** | Production card issuer/processor and PCI/SCA approvals |
| PAY54 dashboard website | Existing app and source security gates | **UNVERIFIED** | Actual Pages publishing settings, historic public asset and private source exposure |
| GitHub + deployer | Draft PR review, source CI, OIDC/GitHub policy and evidence CLI | **BLOCKED** | Protected deployer identity, audited IAM, branch/environment approvals |
| PostgreSQL staging | Canonical migrations 001–020, four role configs/catalogue verifiers | **NOT PROVISIONED** | Private staging DB, real effective privilege/RLS and recovery proof |
| Security + Compliance | KYC/KYB/AML/sanctions, identity and audit test contracts | **PENDING** | Real UK/Nigeria legal/regulated partner acceptance, DPIA and real security operations |
| Mobile and accessibility | Source/testing matrix and account-scoped cache policy | **PENDING** | iOS/Android/web QA with a real authenticated staging backend |
| Performance/Release | Source-only incident/rollback/performance plans | **PENDING** | Actual monitored SLOs, failover, PITR and release drills |

## Open change requests

| Change request | Severity | Owner | Required next evidence | Status |
| --- | --- | --- | --- | --- |
| CR-PAGES-01 | P0 | Security + DevSecOps | Authorised GitHub Pages Settings/deployments, independent site bytes and historical private-file exposure review | OPEN |
| CR-CARD-01 | P0 | Fintech + Frontend | Contracted PSP/issuer, funded capture/refund/chargeback settlement tests; quarantine development simulator | OPEN |
| CR-DEPLOY-01 | P0 | Release + DevSecOps | GitHub protected branch/env, exact OIDC deployer identity, source-only artifacts, real rollback | OPEN |
| CR-IDENTITY-01 | P0 | Security + Founder + Backend | Actual trusted IdP, MFA, public keys, secure recovery, privacy contract, live auth integration | NOT PROVISIONED |
| CR-DB-01 | P0 | DBA + DevSecOps | Managed private PostgreSQL, migration 001–020 and four distinct restricted logins/RLS/PITR | NOT DEPLOYED |
| CR-RATE-01 | P0 | Security + SRE | Distributed atomic auth rate limit, abuse alerts and real outage fail-closed proof | NOT CONNECTED |
| CR-ACCOUNT-02 | P0 | Backend + Mobile | Trusted, authenticated account-context API, Personal/Business switching and cache purging | HTTP 503 |
| CR-FINTECH-01 | P0 | Founder + Compliance + Fintech | Signed UK–Nigeria regulated partners, safeguarding, KYC/AML, funds flow and settlement | NOT APPROVED |
| CR-QA-01 | P1 | QA + UX + Mobile | Real iOS/Android/web account and payment journey, WCAG 2.2 AA, tenant and latency tests | PENDING |
| CR-OBS-01 | P1 | Security + SRE | Durable redacted logs, incident/rollback and performance evidence | PENDING |

## CTO priority and approval boundaries

1. **Real Pages safety before further publication:** Authorised administrator executes the checked-in read-only evidence CLI and supplies redacted results for independent Security review; manually verify active published bundle and historical exposure.
2. **Trusted release chain:** Protected GitHub branch/environment, narrowly scoped OIDC deployer and rollback evidence.
3. **Real controlled staging:** Separate approved infrastructure change for PostgreSQL, four effective roles, immutable signed migrations, secure IdP/MFA and distributed limiter.
4. **Regulated economics:** Contracted UK–Nigeria backbone and two independent Nigerian payout rails, plus separate card PSP/safeguarding/AML.
5. **Operational QA:** Customer account and currency isolation, transaction reconciliation, device accessibility and performance/recovery before go-live.

**Next engineering recommendation:** A 120-action approval interval is acceptable only when meaningful work exists; retain 40-action automated verification checkpoints and security/operational exception gates. For P0 items requiring contracts, cloud rights or external access, stop and obtain the necessary real-world evidence instead of building more source-only simulations.

**CTO production verdict: NO-GO.**
