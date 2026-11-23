# PAY54 Batch 39 — Operational Staging Admission & Real Service Integration

## Protected baseline

PR #78 merged to protected `project-titan` at `a47c86775cf054781cd3d01fc8944cfd5ce4d7b8`. This package continues source-only engineering. **Neither CI nor GitHub credentials constitute permission to inspect or modify a real managed PostgreSQL service.**

## Delivered source and disposable evidence

### Dedicated staging database workload identity

`backend/src/postgres-staging-wallet-reader-config.mjs` introduces a fifth isolated wallet-read pool on top of the pre-existing four identity pools. It refuses credential/user reuse, local/IP hosts, insecure mode, missing CA and any staging-release flag. Its TLS configuration enforces certificate validation, SNI hostname and TLS 1.2 minimum. It does not create a connection or read a secret; real KMS/Secret Manager custody and rotation are still unverified.

`backend/src/postgres-wallet-live-identity-probe.mjs` is an opt-in **actual physical connection** probe designed for an authorised operator to inject a real pool. It reads `session_user`, `current_user`, `pg_roles`, `pg_auth_members`, `pg_stat_ssl`, PostgreSQL function/financial-table privileges, and nine FORCE-RLS flags in one READ COMMITTED READ ONLY transaction. It requires an independently configured expected LOGIN, a disjoint NOLOGIN effective role, TLS 1.2/1.3 and strictly zero direct financial or session reads and writes. It discards the connection on completion.

**Critical limitation:** Unit tests inject a fake pool. They test the probe's rejection logic, **not** a real PAY54 staging database. Server-reported SSL is not proof of independently verified client CA/hostname; the operator must inspect connection/CA evidence separately. No managed PostgreSQL login, host, billing, IAM, CA or credential has been contacted.

### Complete financial RLS and privilege graph

`backend/db/tests/batch22/034_wallet_financial_privilege_graph.sql` executes after the Batch 38 forward migration and before rollback against a disposable PostgreSQL instance. It verifies exactly nine FORCE RLS relations, the restricted function's SECURITY DEFINER owner, independent caller, no reverse owner/caller role inheritance, caller EXECUTE only, no direct ledger/holds/session SELECT or financial writes, owner SELECT and no PUBLIC EXECUTE. The existing funded hold, capture, reversal and post-rollback suite remains part of the same CI job.

The full enterprise privilege graph still requires a **target-environment** inspection of all ledger writer, service, trigger, reporting and maintenance role paths. A successful disposable CI result cannot justify migration to a shared financial database without those witnesses.

### Secure authenticated HTTP integration

The existing Batch 32 HTTP handler, Batch 36/38 authenticated accounting bridge and fresh-session fence remain **unmounted**. Batch 39 deliberately does not connect the accounting-only proof envelope to a customer balance API or publish `availableMinor`, because regulated available-funds semantics and an atomic revocation consistency contract are not approved. The actual staging route requires separate approved workload identity, managed TLS, per-account authorization, rate limiting, timeouts, monitoring and independent penetration testing.

### Financial availability and settlement contract

**No partner-settled customer balance is verified.** The required settlement acceptance contract is:

| Requirement | Primary evidence | Acceptance |
| --- | --- | --- |
| Money custody/safeguarding | Executed banking/payment provider contract, safeguarding accounts and regulatory responsibilities | Compliance + Fintech Architect |
| Settlement provenance | Provider-confirmed settlement ID, currency, provider event ID, effective timestamp, status and independently verified signature | Backend + provider |
| Journal integrity | Balanced POSTED double-entry journal, immutable event correlation and replay prevention | Finance + Security |
| Spending constraints | HELD reservations, capture, release, reversals, refunds, disputes, fraud holds, fees and chargebacks | Fintech Architecture + QA |
| Amount correctness | Liability direction, ISO currency exponents, FX rounding, net-versus-gross reconciliation | Finance + QA |
| As-of consistency | Transactional snapshot revision and fresh-account/session fence | DBA + Security |
| Service readiness | Independently checked runtime identity, TLS, rate limits, audit, failover and incident response | DevSecOps + Release |

Until each acceptance is evidenced, `postedMinor - heldMinor` is **not** an approved `availableMinor`.

### Mobile-first dashboard and accessibility acceptance

The protected dashboard/account-read and security workflow stays active. Actual acceptance must use an independently authorised staging endpoint with real approved balance data and device/browser evidence: iOS Safari, Android Chrome, desktop Chrome/Edge/Firefox, 320px and wider responsive viewports, zoom/text enlargement, WCAG 2.2 AA focus/order/contrast, VoiceOver/TalkBack/NVDA, logout/account switch, offline/retry, timeouts and redacted error states. No live device results have been invented.

### Operational deployment, rollback and observability

1. Name the approved staging project, PostgreSQL provider/instance, DBA, DevSecOps custodian, regulatory owner and release signatory.
2. Read-only attest effective GCP IAM/OIDC, private ingress/egress, database LOGIN/MEMBER graph, server certificate/hostname, CA, Secret Manager metadata, credential rotation, budget and audit logs.
3. Freeze SHA-256 forward and rollback artifacts; independently approve the restricted function/financial RLS migration and rehearse on a clone of the *actual staging baseline*.
4. Before any persistent apply, test existing ledger writers, reservations, reversals, triggers and all service principals with forced RLS. Resolve any regressions without weakening tenant isolation.
5. Keep the wallet API disabled. Test workload identity and real restricted SQL read with disposable identity. Establish session revocation consistency barrier, financial provider settlement, rate limits and full audit traces before turning it on.
6. Verify monitors, alert routing, incident owner, release observability and rollback: disable route; drain transactions; revoke EXECUTE; rotate credentials if compromised; rollback the exact reviewed migration; check audit/ledger invariants.
7. Capture signed DBA, Security, Fintech, Compliance, Frontend QA and Release approvals.

## Evidence status and next required user action

| Gate | Source verification | Live external verification |
| --- | --- | --- |
| Dedicated wallet reader pool/TLS configuration | Implemented | Missing provider, host, real IAM and secrets |
| Nine-relation RLS function privilege graph | Disposable CI proof | Target managed DB and writer role audit missing |
| Session revocation | Source/read-snapshot tests | Complete atomic in-flight fence not proven |
| API | Existing unmounted source contracts | Real authenticated route not deployed |
| Customer available balance | Accounting-only | Contracted settlement and finance signoff missing |
| Mobile accessibility | Existing regressions | Real signed device matrix missing |
| Operational staging | Reviewable rollback candidate | DBA/cloud owner, monitoring and change approval missing |

**User input before live staging checks:** confirm intended PostgreSQL provider and instance/project, responsible staging administrator and authorised release approver. Do not send login credentials, tokens, private endpoints or certificate keys to chat.

**Decision: source-only / staging NO-GO / production NO-GO. No production financial execution or real money is authorised.**
