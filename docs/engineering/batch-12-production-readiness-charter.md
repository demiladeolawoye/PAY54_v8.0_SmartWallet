# PAY54 Enterprise Platform — Batch 12 Charter and Launch Execution Backlog

**Created:** 2026-11-16
**Branch:** project-titan
**Prior approved batch:** 262–311, complete at 50/50.
**Founder instruction:** Proceed with planning and source-only engineering; no authorisation to create live credentials, change Pages settings, provision cloud, grant customer SELECT, conduct financial transactions or enable cryptocurrency execution.

## Purpose

Pivot from source-only assurance toward independently verifiable launch readiness, provider integration contracts and mobile-first user journey acceptance. Maintain the PAY54 orchestrator model above licensed local/global partner rails, with Nigeria as the first African market and the UK–Nigeria corridor as the initial focus.

Batch 12 is deliberately **not assigned a fabricated 50-item task count**. The following 14 programmes are real delivery epics requiring decomposition, estimates, accountable owners and measurable completion evidence before the launch-date forecast is reliable.

## Production execution task board

| ID | Priority | Delivery epic | Initial acceptance evidence | Owner | Current state |
|---|---|---|---|---|---|
| P-01 | P0 | GitHub Pages exposure & separation | Owner-provided Pages configuration, reviewed public-site artefacts, no sensitive content reachable | DevSecOps / Founder | OWNER ACTION |
| P-02 | P0 | Protected CI, release account and environments | Branch/ruleset evidence, approved least-privilege deployer, immutable Actions references, reviewed OIDC trust | DevSecOps / Founder | ADMIN APPROVAL REQUIRED |
| P-03 | P0 | Private staging with no consumer funds | Independently approved Terraform plan, verified runtime IAM, ingress, egress, DNS, alerting and rollback | Cloud / Security | NOT DEPLOYED |
| P-04 | P0 | Backend identity and credential custody | Trusted TLS/role binding, vault, rotation, negative tests and audit trail | Backend / Security | INDEPENDENT PROOF NEEDED |
| P-05 | P0 | PostgreSQL tenant data isolation | External RLS review, least-privilege grants, role switching and cross-tenant negative tests | DBA / Security | BLOCKED |
| P-06 | P0 | Durable event audit and evidence | Append-only sink, independently attested readback/receipt, recovery and retention | Security / Compliance | NOT ATTESTED |
| P-07 | P0 | UK and Nigeria legal / licensing / AML | Counsel sign-off, regulatory perimeter, customer funds safeguarding and disclosures | Compliance / Legal | OPEN |
| P-08 | P0 | Banking and payout provider onboarding | Approved UK rail, global backbone and two Nigerian payout alternatives, contracted test environments | Partnerships / Fintech | OPEN |
| P-09 | P0 | Real money ledger/FX/reconciliation correctness | Double-entry invariants, failure recovery, idempotency, refunds/chargebacks, daily breaks | Fintech / QA | INDEPENDENT TESTS OPEN |
| P-10 | P1 | Mobile-first customer experience | Onboarding, wallet, send/receive, quote, bill/card gating and accessibility evidence | Frontend / Mobile | END-TO-END QA OPEN |
| P-11 | P0 | Risk, support and operations | Fraud monitoring, incident response, dispute SLAs, backup restore and support controls | Risk / Operations | OPEN |
| P-12 | P0 | Independent assurance | Penetration, performance, resilience, device, accessibility, regression and UAT reports | QA / Security | OPEN |
| P-13 | P0 | Governed launch | Closed pilot, release checklist, rollback rehearsal, approvals and monitoring | Release Office | BLOCKED |
| P-14 | P1 | Funding and partner economics | Funded operating plan, contract unit economics and phased launch budget | Founder / Finance | OPEN |

## Proposed first source-only implementation sequence

| Candidate ID | Proposed task | Completion criteria |
|---|---|---|
| 312 | Batch 12 production-readiness charter | Source-only charter committed; no release claim |
| 313 | UK–Nigeria and crypto feature-gate matrix | Country, feature, provider scope, regulatory ownership and default deny |
| 314 | Crypto orchestration architecture decision | Partner model, custody split, quote-to-execution and ledger boundary |
| 315 | Cryptocurrency transaction state-machine design | Explicit provider state model, expiry, idempotency, reconciliation and fail-closed cases |
| 316 | Source-only capability policy and adversarial tests | Disabled until independently verified contracted/permitted status |
| 317+ | Integration and acceptance work | Prioritise based on actual source review, partner agreements and user-journey dependency |

Counts beyond these are not committed or promised. Never substitute offline scripts for a commissioned runtime review.

## New product and platform suggestions for Founder discussion

1. **PAY54 Universal Payment Intent**: one signed and authenticated intent across mobile, web, QR, deep links and permitted WhatsApp channels; chat messages alone never authorise a payment.
2. **Transparent Route Intelligence**: offer GBP/NGN quotes from permitted partners with clearly disclosed fees, rate, ETA, refund destination and delivery confidence; no unsupported routing claims.
3. **PAY54 Global Account Profile**: one verified consumer/business identity with country-appropriate wallets, account capabilities and compliance lifecycle.
4. **Crypto Hub (future, gated)**: partner-led buy, sell, convert, external withdrawal and optional stablecoin cross-border rail, enabled independently for each jurisdiction and counterparty.
5. **Recovery and Dispute Centre**: transaction evidence, real-time status, retry-safe recovery, complaints and support inside the app, not across scattered menus.
6. **SELLIBUY Trust Commerce**: legally sellable goods, seller onboarding, verified payments, dispute handling and buyer-protection UX, separately gated from wallet launch.
7. **PAY54 Rewards**: margin-funded points with liability accounting and merchant partner redemption, no unapproved cash-out.
8. **Low-bandwidth, accessibility-first UX**: reusable universal search, context-aware actions and confirmation screens that communicate fees, timing, risk and reversibility.
9. **Partner Operations Console**: reconciliation breaks, provider degradation, chargebacks, incident actions, country launch flags and audit trails with separation of duties.

## Founder approval boundaries

Source-only research, architecture, tests and docs are allowed under the present 'please proceed'. Any partner contract execution, external account registration, GitHub settings change, credential issuance, Terraform apply, live payment/crypto execution, customer data access or public launch requires an explicit separate approval and qualified compliance review.

This document is a planning and delivery artefact, not a statement of regulatory authorisation or production readiness.
