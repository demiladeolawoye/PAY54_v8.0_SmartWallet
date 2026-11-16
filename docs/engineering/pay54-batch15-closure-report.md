# PAY54 — Batch 15 engineering closure and Founder approval packet

**Implementation:** 515 · **Cycle:** 468–517 · **Date:** 16 November 2026  
**Review branch:** `cto/batch15-publication-boundary-468-517`  
**Merge position:** Draft PR stacked on unmerged Batch 14 and Batch 13  
**Production release:** BLOCKED / NO-GO

## Executive position

The source-only engineering work in Batch 15 focuses on the previously unresolved Pages publication-boundary risk, combines offline artifact metadata verification, strengthens staging and package checks and extends fail-closed financial/account release posture. The final CTO task board completes item 517; source-deliverable count is not operational readiness.

The most important newly independently substantiated discovery is the **actual GitHub Pages artifact packaging failure**: artifact `14252395793` from run `43917703697` included 616 regular files, of which 348 were in `backend/`, 150 in `docs/` and one in `infrastructure/`. This was measured by direct read-only metadata inspection, not inferred from a successful build log.

The artifact's real public URL reachability, active deployment version, sensitive data disclosure and credential compromise remain **unverified**. A bounded pattern scan found one private-key header marker in a packaged backend test file; this cannot establish a usable private key or incident scope.

## Committed source implementation catalogue

| Implementation | Concrete deliverable |
| --- | --- |
| 468–470 | Offline publication-tree inspection, adversarial file/path tests, dedicated read-only CI |
| 471–473 | Integrate tree inspection into isolated staging, stage refusal regressions, CI |
| 474–476 | SHA-256 candidate-to-stage combined attestation, mutation/hidden-file regressions, CI |
| 477–479 | Measured real Pages artifact P0 evidence record, truth-preserving tests, CI |
| 480–481 | Deny internal documentation paths; regression for docs/infrastructure |
| 482–484 | Bounded read-only tar member parser, checksum/path/unsafe type tests, CI |
| 485–487 | Separate confirmed artifact failure from public URL/secret exposure and CI |
| 488–490 | GitHub artifact run/commit/hash provenance evidence checks and CI |
| 491–493 | Value-free credential marker evidence classification and CI |
| 494–496 | Update real P0 marker evidence; redaction and malformed tar tests |
| 497–499 | Public URL HEAD/404 vs authorised GET content-digest evidence distinction |
| 500–502 | Dry-run Pages upload plan rejects repository root, wrong digest and unprotected environment |
| 503–505 | Financial production acceptance: RLS, safeguarding, AML, ledger, partner and support gates |
| 506–508 | Personal/Business account cutover authenticated actor, RLS and cross-tenant deny gates |
| 509–511 | Compose security, Pages, financial, account and rollback release posture without enabling anything |
| 512–514 | P0 containment playbook, independent operational approval tests and CI |
| 515–517 | Closure report, acceptance regression and CTO task-board reconciliation |

## Current production obstacles and requested decisions

| Priority | Workstream | Confirmed / unresolved | Required next action |
| --- | --- | --- | --- |
| P0 | GitHub Pages artifact publishing boundary | FAILED in inspected artifact | Founder/Security review actual active deployment, containment and rollback |
| P0 | Public backend URL reachability | UNVERIFIED | Authorised bounded investigation; preserve minimal evidence |
| P0 | Credential/sensitive content impact | UNVERIFIED | Security/Legal impact assessment; do not infer compromise |
| P0 | GitHub Pages workflow, rules and deployer controls | UNVERIFIED operationally | Read-only settings/evidence review, then separately approved changes |
| P1 | Source-only restricted Pages staging | IMPLEMENTED; not deployed | Independent dependency and customer journey review |
| P1 | PostgreSQL tenant RLS and real auth/account context switching | NOT CERTIFIED | Real integration and negative tests under controlled backend |
| P1 | FX, cards, KYC/AML, wallet ledger and partner contracts | NOT AUTHORISED FOR LIVE MONEY | Provider, legal, safeguarding and reconciliation evidence |
| P1 | Mobile/desktop QA, accessibility, latency, rollback | NOT CERTIFIED | Full independent QA and recovery rehearsal |
| P1 | Operational signer keys and incident process | NOT ACTIVATED | Security/DevSecOps approvals, custody/revocation evidence |

## Additional change requests recommended for Founder discussion

- CR-PAGES-01: Independently confirm active Pages deployment root and determine appropriate temporary containment with rollback.
- CR-PAGES-02: After independent approval, replace any root-based Pages upload with a verified restricted static-site output. Test authentication, navigation and all linked assets before cutover.
- CR-DEVOPS-01: Review branch rulesets, protected deployment environments and GitHub deployer identity with OIDC and separated permissions.
- CR-SECURITY-01: Perform a scoped impact assessment of actual published material and potential credential rotation; do not publish forensic source content to public GitHub.
- CR-FINTECH-01: Independently verify UK–Nigeria provider agreements, KYC/AML, safeguarding and ledger reconciliation before real-money activation.
- CR-QA-01: Establish exact-source mobile/desktop regression, accessibility, P95 latency and recovery evidence.
- CR-UX-01: Preserve PAY54's simplified wallet experience; discuss verified WhatsApp/social entry, traveller virtual card and rewards features only after their provider and safety gates.

## Control and scope restrictions

No GitHub Pages settings, production branch rules, credentials, live deployment, customer database privileges, account context switching, card issuing, FX execution, crypto processing or customer payment functions were activated by Batch 15. All new policy outputs deliberately return release BLOCKED.

Do not merge the stacked draft pull requests automatically. Confirm the **final exact source commit's** CI workflow conclusions before reporting full regression success; a cancelled run is not a PASS.

**Founder approval checkpoint:** Batch 15 source implementation cycle 468–517 reaches 50/50 when item 517 commits. Batch 16 (518–567) requires separate approval. Completion of a source cycle must not automatically close P0 or any production acceptance gate.
