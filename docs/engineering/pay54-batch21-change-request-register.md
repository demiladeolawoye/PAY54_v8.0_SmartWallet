# PAY54 CTO — Batch 21 Change Request and Risk Register

**Review scope:** source implementations 768–817 on stacked Draft PR #9.
**Decision:** NO-GO for production. No source control merge or deployment is approved.
**Purpose:** preserve separate traceability for engineering progress versus real operational acceptance.

| Priority | Change request | Current evidence | Work still required | Accountable approval |
| --- | --- | --- | --- | --- |
| P0 | CR-ACCOUNT-02 — functional Personal/Business switching | Nonexecuting membership, session, CSRF, directory, audit and cache contracts; adversarial tests | Provision real backend sessions, account store, atomic version/nonce CAS, fresh CSRF/session, revocation, audit, RLS and account reads; verify real cross-tenant isolation | Founder, Backend, Security |
| P0 | CR-PAGES-01 — historical Pages packaging breach boundary | Historic artifact overpacking previously confirmed | Independently inspect current Pages configuration, artifact, public reachability and actual source exposure; decide containment with rollback | Founder, Security, DevSecOps |
| P0 | CR-CARD-01 — excluded linked-card development provider | Current release-manifest exclusion and known HTML reference | Choose contracted provider or explicitly authorised disabled preview; no bypass or silent funding regression | Founder, Fintech Architect |
| P0 | CR-DEPLOY-01 — protected deployer and release controls | Read-only pinned CI only | Verify actual GitHub permissions/rulesets, OIDC deployer, restricted artifact and rollback evidence | Founder, DevSecOps, Release Manager |
| P0 | CR-FINTECH-01 — regulated UK–Nigeria money movement | No real-money execution enabled | Provider contracts, safeguarding, KYC/KYB, AML/sanctions, settlement and reconciliation acceptance | Founder, Compliance, Fintech Architect |
| P1 | CR-UX-03 — dashboard first-paint/accessibility | Synthetic mobile/desktop view tested in Batch 20 | Real authenticated device/browser/assistive-technology and recovery regression against accepted SHA | QA, Security, UX |
| P1 | CR-ACCOUNT-03 — client cache and concurrent-read safety | Read session continuity and ten-domain evidence contracts | Instrument actual in-flight cancellation, stale response withholding, account-bound cache partitions and production device tests | Frontend, Backend, Security |

## Non-negotiable release boundaries

- The backend still answers unprovisioned account discovery and context requests with HTTP 503.
- None of the domain plans demonstrates actual PostgreSQL RLS, privileged session rotation, live customer identity or permissioned money services.
- A mocked `rlsEnforced: true` flag is a caller-supplied contract assertion, **not proof of live database controls**.
- Tests using synthetic accounts, clocks and CSRF values are source regressions, **not real tenant or real payment acceptance**.
- No frontend/ledger/cards/payment execution, Pages settings, infrastructure privilege or public deployment was changed by this batch.
- Recorded implementation count and test success cannot override independent Founder/Security/Release approval.

**Recommended next cycle:** implement a deployed trusted account read service and PostgreSQL-backed session/membership transaction with real integration tests **only after database schema, credentials, infrastructure ownership and release control are confirmed**. Until then retain fail-closed services.
