# PAY54 Batch 25 / 1015 — Authentication, Accounts, Payments and Release QA

**Scope:** Pre-staging acceptance matrix. No real staging, customer-device or production performance result has been recorded by this batch. All measured targets are to be signed off by QA/Performance/Compliance owners before use.

| Case | Fault or normal operation | Required acceptance evidence |
| --- | --- | --- |
| B25-QA01 | Exact Ed25519 issuer/audience/scope/JTI with key rollover | Trusted assertion accepted only inside authorised lifetime; no ID token/role forgery |
| B25-QA02 | Two concurrent uses of signed assertion | Exactly one unique issuer/JTI receipt and one unbound bootstrap session |
| B25-QA03 | Two concurrent first-account binds | One old-session revocation, one new session, one audit; loser denied |
| B25-QA04 | Revoked Personal/Business member or suspended KYB | No account bind, wallet access, funds or card authorisation |
| B25-QA05 | Lost COMMIT, credential/session-digest collision, audit failure | Connection discarded, no fresh credential disclosed, safe reauth and reconciled audit |
| B25-QA06 | Fake Origin, duplicate headers, overlength JSON and malicious path | Rejected before verifier/database, no raw JWT in logs |
| B25-QA07 | Rate limiter distributed-store outage and replay burst | Fail-closed, observable security alarm, no fallback local counter |
| B25-QA08 | Android/iOS/browser background, multitabs and stale response | Cache and UI context partitioned by actual signed account/session generation |
| B25-QA09 | Card source, funding quotes, authorise/3DS/capture/refund/reversal | Development provider never funds real wallets; licensed partner acceptance separately verified |
| B25-QA10 | UK–Nigeria cross-border FX, payout failover and reconciliation | Legal/payment partner acceptance, idempotent financial posting, explicit suspense handling |
| B25-QA11 | Actual deployed Pages access and sensitive paths | Exact public artifact/Settings evidence; no backend, secrets or development-card financial build |
| B25-QA12 | Deployment role bypass, OIDC forgery, rollback | Approved exact workflow/branch, narrow IAM, reproducible restore and audit |
| B25-QA13 | Screenreader/keyboard/touch, 200–400% zoom | WCAG 2.2 AA audit for account transition, authentication and financial denial |
| B25-QA14 | Load, failover, memory pressure and PostgreSQL pool saturation | Representative traffic model, percentile latency, error budget, tracing and recovery proof |

## Security-first performance instrumentation

Measure p50/p95/p99 authentication latency separately from IdP and PostgreSQL latency; record pool wait, row-lock contention, serialisation conflicts, 429/401/403/503 counts, replay collisions, token expiry skew, audit write time, provider acknowledgment and true ledger reconciliation lag. Establish sustainable and stress throughput targets from approved partner limits and realistic customer load—not a synthetic headline number. Never load-test with customer credentials or production money.

All tests must be associated with exact reviewed Git SHA, independent staging environment ID, recorded time, QA owner, redacted trace, defect/reference, and applicable security/legal signature. CI mocks and disposable PostgreSQL tests count as **source regression**, not live operating proof.

**Current QA verdict:** P0 staging/identity/card/partner/deployer gates blocked; real device/production performance evidence pending.