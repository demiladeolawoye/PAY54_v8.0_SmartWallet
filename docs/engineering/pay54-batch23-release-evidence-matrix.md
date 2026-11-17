# PAY54 Batch 23 / 916 — Independent Release-Evidence Decision Matrix

**Decision scope:** Review source-only Batch 23 and possible future controlled STAGING trials. This document does not authorise any deployment.

| Gate | Minimum evidence | Current availability | Decision |
| --- | --- | --- | --- |
| G1 — Exact source revision | Committed immutable SHA, signed review, source and existing regression CI on exact SHA | Source PR #11; final-head CI to verify | PENDING |
| G2 — Canonical SQL | DBA-approved migrations 001–018, source SHA256 fingerprint, conflict and rollback test | Disposable PostgreSQL scripts only | NOT OPERATIONAL |
| G3 — Identity authority | Independently provisioned authentication and session issuer, secure transport and caller admission | Trusted session read resolver/rotation only | BLOCK |
| G4 — PostgreSQL IAM | Actual isolated login-to-NOLOGIN-role mapping, catalog proof, no caller DML, restricted definer role | Simulated `SET ROLE` and source checks only | BLOCK |
| G5 — Tenant security | Real distinct staging principals, cross-tenant RLS, Business viewer/operator and revoked membership denial | Synthetic SQL fixture evidence only | BLOCK |
| G6 — Rebind atomicity | Concurrency, replay, old-token revocation, audit committed once, crash/failover and recovery | Disposable PostgreSQL and Node tests | PARTIAL |
| G7 — Wallet, ledger and cards | Account-bound financial data, no Business/Personal leak, contracted provider and reconciliation | Read-admission contracts; no live financial service | BLOCK |
| G8 — Pages containment | Current Pages branch/build artifact enumeration, public reachability, sensitivity classification and signed remediation | Historic artifact risk only; current public state unverified | BLOCK |
| G9 — GitHub release | Protected source branch, approved environment, OIDC subject, scoped deployer, two-person review and rollback | No accepted end-to-end deployer evidence | BLOCK |
| G10 — Customer UX | Real iOS/Android/web/desktop account switch, accessibility, multi-tab/offline and ten-domain cache isolation | QA plan only | BLOCK |
| G11 — Regulatory | UK–Nigeria payment contracts, customer-funds safeguarding, AML/KYC/KYB, complaints, resilience, data protection | Approval not demonstrated | BLOCK |
| G12 — Recovery | PITR restoration, rollback drill, compromised credential response, immutable audit export | Runbook only | BLOCK |

## Three separate decisions

**Source acceptance:** CTO/Security may confirm code and exact-SHA CI without merging or deploying.

**Controlled staging trial:** Founder/Security/DBA/Release may separately approve *only after* trusted environment provisioning, controls G1–G6 and safe rollback. This is not implied by source acceptance.

**Production go-live:** Founder/Compliance/Fintech Architect/Security/Release must independently approve every applicable gate, including G7–G12 and regulated partner readiness. No source assessment or signature-verifier result may automatically flip this decision.

## Red lines

Keep `/v1/accounts`, `/v1/account-context/*`, money execution and provider features fail-closed until separately approved. Do not publish backend SQL, private docs or a development-linked-card provider through Pages. Never claim DB role catalog checks prove that real user sessions and payment permissions are correctly wired.

**Current verdict:** Production NO-GO, staging activation unapproved, source-review evidence still being reconciled.
