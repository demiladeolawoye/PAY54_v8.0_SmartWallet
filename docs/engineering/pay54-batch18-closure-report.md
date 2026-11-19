# PAY54 CTO — Batch 18 Founder Closure and Release Decision

**Date:** 16 November 2026  
**Implementations:** 618–667 · **Target:** 50 individually auditable source deliverables  
**GitHub:** Draft PR #6, stacked on draft PR #5 → #4 → #3 → #2 → #1 → `project-titan`  
**Product:** PAY54 One Wallet — Everywhere, UK–Nigeria-first enterprise fintech platform  
**Release verdict:** **NO-GO for live GitHub Pages replacement and real financial operations**

## Executive result

Batch 18 focuses on security-first release engineering after the founder-approved balance-card and tablet layout repairs. It does **not** change money engines, account records, live Pages settings, real customers, provider credentials, deployment identity or real-money authorisation.

The source now has independent audits for first-party HTML dependencies, linked-card development scripts, declared GitHub Pages workflows, downloaded Pages tar integrity and current-site publication readiness. It also has bounded evidence packets for the actual Pages settings, provider/feature decision, least-privileged deployer, rollback, incident sensitivity and exact-commit dashboard QA. They produce explicit **BLOCKED / NO-GO** results until independently verified operational evidence exists.

A short-lived GitHub Actions **offline founder dashboard** ZIP is generated from the exact PR head. The artifact contains inert HTML, visual styles/images, a SHA-256 manifest and no runtime application JavaScript, server code or live banking credentials. It is not a hosted preview or a production deployment.

## Auditable implementation catalogue

| IDs | Deliverables |
| --- | --- |
| 618–620 | First-party HTML dependency classifier, missing/forbidden/traversal tests and dedicated source-only CI |
| 621–624 | Bounded owner-supplied active Pages evidence register, adversarial tests, read-only settings/evidence guide and governance tests |
| 625–628 | Explicit linked-card production provider versus server-gated preview option, tests and integrated Pages/provider release matrix |
| 629–630 | Exact PR SHA offline founder dashboard artifact workflow and real-source balance disclosure tests |
| 631–632 | Read-only Pages workflow declaration inventory and negative tests distinguishing local source from active deployment |
| 633–636 | Bounded SHA-256 tar member byte attestation, adversarial tests, local restricted-tree/down­loaded artifact comparator and tests |
| 637–639 | Development runtime script inventory, tests and CI enforcing current real-source NO-GO |
| 640–641 | Reject unexpected tar directories and nonzero trailing archive payload; targeted negative tests |
| 642–643 | Bounded rollback evidence schema, retained known-good artifact and rehearsal tests |
| 644–647 | Distinguish historic overpublication, HTTP-only observation, confirmed current content and sensitivity; nonexecuting incident decision support and tests |
| 648–650 | Exact-source mobile/tablet/desktop and accessibility QA evidence, tests, operational release controls in CI |
| 651–652 | CTO deployment scorecard and integration tests for source and independent settings status |
| 653–654 | Least-privileged Pages deployer evidence including OIDC, permissions, environment rules and reviewer gates, with tests |
| 655–658 | Final cross-domain NO-GO release gate, tests, CI enforcement and scope validation of the nonpublishing workflow |
| 659–660 | Linked-card partner/feature deployment choices, regulatory/PCI/ledger and funding regression requirements, plus governance tests |
| 661–662 | Protected Pages replacement and rollback runbook, plus prevention-of-unsafe-rollback tests |
| 663–664 | Founder dashboard review and exact-release accessibility/mobile acceptance, plus tests |
| 665–667 | CTO closure report, source truth/approval tests and reconciled task-board checkpoint |

## What is actually verified

- The previous Batch 17 dashboard repair, sample balance details and tablet Money Moves improvements have passed synthetic desktop/tablet/mobile visual and browser DOM checks on earlier exact review SHAs. A newly modified release source needs fresh exact-SHA visual and authenticated sandbox verification.
- Batch 17 final source commit `3a25285a96fd2f92e52d18786674864b5f1b2984` had **12/12 GitHub Actions SUCCESS**.
- A historical GitHub Pages Actions artifact `14252395793` included **348 backend files, 150 documentation files and one infrastructure file**; this establishes an overbroad artifact, **not** independently confirmed current public URL exposure.
- The current source dashboard references the development-only `assets/js/infrastructure/payments/providers/linked-card-development.js`, which is intentionally excluded by the restricted site policy. As a result, the current source **cannot yet be packaged as a complete, safe customer Pages release**.
- The existing linked-card funding adapter fails closed without a provider; no mock has been promoted or relocated to bypass the policy.

## Outstanding security and launch decisions

| Priority | Owner | Required evidence or change | Current position |
| --- | --- | --- | --- |
| P0 | Founder + Security + DevSecOps | Actual signed-in `Settings → Pages`, active deployment SHA, artifact, branch/environment, HTTPS and deployed public source reachability | NOT VERIFIED |
| P0 | Security + Legal | Independent current content sensitivity and potential incident scope, with appropriate containment/rotation if confirmed | NOT VERIFIED |
| P0 | Founder + Fintech Architect | Approved production linked-card provider **or** specifically approved, backend-disabled preview capability, preserving other funding pathways | DECISION OPEN |
| P0 | Release Manager + DevSecOps | Full restricted website source graph, independent artifact SHA attestation, protected deployer, known-good safe rollback | BLOCKED |
| P1 | QA + Frontend + UX | Current exact-commit screenshot, mobile/tablet/desktop, keyboard/screen-reader and login/payment preview behavior | PARTIAL SOURCE/SYNTHETIC |
| P1 | Backend + Security | Authenticated consumer/business isolation, PostgreSQL RLS and API money-flow acceptance | NOT PRODUCTION ACCEPTED |
| P1 | Compliance + Partners | UK–Nigeria KYC/AML, safeguarding, card/FX provider agreements, settlement and reconciliation | NOT PRODUCTION ACCEPTED |

## Requested founder change register and reminders

1. **CR-PAGES-01:** Founder supplies read-only screenshot of actual GitHub Pages build/source settings; Security independently verifies active deployment and P0 public impact.
2. **CR-CARD-01:** Discuss and select contracted linked-card provider versus explicitly disabled public-preview funding. No silent relocation of simulator or regression.
3. **CR-DEPLOYER-01:** Confirm protected `github-pages` environment, OIDC identity, branch rules, required reviewers, restricted Actions permissions and dedicated deployment account.
4. **CR-ROLLBACK-01:** Retain a verified safe historical artifact and record SHA, rehearsal, health checks and incident recovery.
5. **CR-UX-01:** Founder reviews latest inert balance dashboard preview; record menu/navigation and mobile UX changes before separate UI approval.
6. **CR-AUTH-01:** Confirm multi-account/tenant RLS and real authenticated sandbox acceptance before consumer or business go-live.
7. **CR-LAUNCH-01:** Record named regulated UK–Nigeria partners, compliance/financial controls, settlement and customer support dependencies before live funds.

**Do not confuse source-complete engineering with launch readiness.** A visual preview or a passing CI workflow cannot certify current public exposure, regulatory status, real-money settlement or customer identity protection.

## Final acceptance boundaries

- **PR #6 remains DRAFT, unmerged and stacked** on five preceding draft PRs. No branch is automatically merged.
- **No GitHub Pages deployment, settings or OIDC/deployer permission changes** are made by Batch 18.
- **No financial engine, ledger, card issuer, customer authentication, KYC data or real money is activated**.
- All deployed-site containment, credentials and release decisions require separate Security/Release/Founder change control.
- The final exact source commit and all applicable CI workflows must be reconciled after item 667; never extrapolate an earlier green run to a later SHA.
- A new Batch 19 cycle (668–717) requires renewed founder approval; an actual deployment requires distinct operational approval irrespective of source implementation count.

**CTO decision:** Maintain production **NO-GO** until current Pages control-plane exposure is independently reviewed, the development linked-card provider is resolved through an approved feature/provider decision, and restricted artifact, regression, protected deployer and rollback acceptance is complete.
