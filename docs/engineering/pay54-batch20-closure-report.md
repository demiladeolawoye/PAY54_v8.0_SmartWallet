# PAY54 CTO — Batch 20 Final Engineering Closure

**Cycle:** Batch 20 · **Source implementations:** 718–767 (50 auditable review deliverables)  
**Approved changes:** CR-UX-03 prevent legacy dashboard flash; CR-ACCOUNT-02 restore secure account context presentation  
**GitHub:** Draft PR #8, stacked on unmerged PRs #7 → #6 → #5 → #4 → #3 → #2 → #1  
**Deployment:** **NO-GO — source review only**

## Executive outcome

The previously visible old dashboard after login has been suppressed at first paint in the review branch: the initial HTML and early stylesheet hide its interactive shell until the new approved blueprint is verified. A failed bootstrap or timeout shows an accessible retry state instead of revealing the old dashboard. These changes have passing synthetic browser and source tests; the real live Pages deployment has not changed.

The Personal/Business context control is visibly restored next to the profile and optimised for mobile, with a sidebar account status and keyboard/outside-click dismissal. Business remains unavailable until an authenticated backend can list membership-authorised accounts, safely rebind the session, enforce PostgreSQL RLS and refresh all financial data under the selected account. A context label or click alone is never trusted as selection.

Items 755–765 add concrete server-side contract layers and tests: canonical domain authorisation, expired/stale session refusal, ten-domain cache refresh requirements and an explicit fail-closed `503 ACCOUNT_CONTEXT_SERVICE_UNAVAILABLE` HTTP response on the still-unprovisioned backend. **No actual server-side Personal↔Business switch is enabled or claimed to work.**

## Full Batch 20 implementation ledger

| Number(s) | Completed engineering |
| --- | --- |
| 718–719 | Bounded HTML start-tag parser and adversarial test coverage |
| 720–722 | Wire canonical resource scanner to real attributes; tests and read-only CI |
| 723–725 | Restore correct quoted markup/comment handling, regression fixes |
| 726–731 | Prevent old dashboard first paint; accessible failure recovery and VM tests |
| 732 | Founder UX/account change request and approval tracking |
| 733–740 | Desktop/mobile Personal account selector, panel, a11y and full non-switching regression |
| 741–746 | Founder-approval recording, session refresh and legacy test compatibility |
| 747–754 | Synthetic desktop/mobile Chromium acceptance, CSP-compatible test-only identity mock, mobile header refinement |
| 755–756 | Server-sourced canonical account membership view proposal and negative authorisation tests |
| 757–758 | Trusted session rebind plan: expiry, version, ownership, replay/no-op negative tests |
| 759–760 | Account-scoped ten-domain cache/in-flight refresh plan and negative tests |
| 761–762 | Backend account selection/discovery 503 no-store denial and actual HTTP regression tests |
| 763 | Cross-module Personal→Business test proves no false session, financial or cache switch |
| 764–765 | Production context-cutover contract and governance acceptance tests |
| 766–767 | CTO closure/change register and reconciled final task board |

## Verified and not-yet-verified

Prior to items 755–767, all eleven review workflows passed on commit `6f3a8b4b40d686d0edcf8f3088bd917af637c854`. Synthetic Chromium desktop 1440×900 and mobile 390×844 verified the new dashboard and visible Personal account selector on review commit `8a44fcf8325b1d09aee58eafe92b114ecd048abb` (run `44050046510`, screenshot-only artifact `14312788218`). They are not evidence of an authorised customer Business account, interactive production payments or live Pages deployment.

**The final Batch 20 source SHA and the complete eleven-workflow conclusions must be checked separately after implementation 767 is committed.** Earlier green runs cannot be inherited by the later source revision. Any failing check must be corrected before claiming final CI success.

## Remaining operational risks, changes and owner decisions

| Priority | Change request | Owner / acceptance | Status |
| --- | --- | --- | --- |
| P0 | CR-PAGES-01 active GitHub Pages settings, deployed artifact, public source reachability and content sensitivity | Founder + Security + DevSecOps | OPEN |
| P0 | CR-CARD-01 development-only linked-card provider outside approved public tree | Fintech Architect + Founder: contracted production provider **or** independently approved server-disabled preview | OPEN |
| P0 | CR-ACCOUNT-02 functional Personal↔Business switch | Backend + Security: actual principal/session store, account membership, RLS, CSRF, revocation, atomic rebind and cross-account browser QA | SOURCE CONTRACT ONLY |
| P0 | CR-DEPLOY-01 publication artifact, protected deployer and independent rollback | DevSecOps + Release Manager + Founder | OPEN |
| P1 | CR-UX-03 real authenticated dashboard first paint, mobile/tablet/desktop and assistive technology | QA + Frontend + Security | SYNTHETIC SOURCE PASS; LIVE NOT VERIFIED |
| P1 | CR-FINTECH-01 UK–Nigeria contracts, safeguarding, KYC/AML, provider settlement, financial posting and reconciliation | Compliance + Fintech Architect | NOT PRODUCTION ACCEPTED |

The original historical Pages artifact included internal backend/documentation/infrastructure source. That is evidence of an unsafe historical **artifact packaging boundary**, **not independent proof of currently reachable public source or credential compromise**.

## CTO release and production controls

The complete implementation cycle represents **50/50 source work items**, not a production launch. Keep PR #8 as a draft stacked review, and keep all previous draft PRs unmerged. No Pages publishing/settings, production bank service, active tenant account switch, customer database grants, secret rotation or money operation has been authorised or performed. Do not relocate the development linked-card simulator into public assets just to pass a source check.

**Next proposed engineering cycle:** Batch 21 (768–817) requires fresh Founder approval. Any real website release requires a separate Founder, Security and Release Manager operational approval based on the actual deployment, restricted artifact, provider disposition, protected identity and verified rollback.

**CTO decision: NO-GO for public replacement and real-money operation until the P0 evidence and functional backend/service controls are independently accepted.**
