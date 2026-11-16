# PAY54 Batch 12 — Frontend-Only Pages Replacement Acceptance

**Date:** 2026-11-16
**Branch:** project-titan
**Status:** SOURCE IMPLEMENTATION, NO RELEASE AUTHORITY

## Observed starting point

The GitHub repository is public. Existing Pages run 43913053580 successfully uploaded artifact 14247733115, and its build log included backend sources and tests. The workflow reported deployment at https://demiladeolawoye.github.io/PAY54_v8.0_SmartWallet/. The exact public reachability of individual backend URLs and Pages publishing settings remain unverified, and secrets disclosure is not established.

**Do not treat successful GitHub Pages jobs as approval to publish broad repository contents.**

## Review-only implementation

- 364: existing static candidate inventory of nine application HTML pages and selected frontend asset folders, excluding backups and other source.
- 368: local HTML/CSS/static ESM dependency check. Refuses missing local scripts, missing stylesheets, path traversal and unreviewed remote sources. It recognises the two current QR/CDN URLs as known resources but does not verify SRI or their delivery.
- 369: real-repository and adversarial dependency tests.
- 370: surgical exception for the eight actual browser security scripts in assets/js/security. The generic security directory and all non-allowlisted scripts remain prohibited.
- 371: tests preserve the reviewed browser security files and reject private security contents.
- 372: stagePay54StaticSiteReview produces a separate temporary, front-end-only review directory and SHA-256 file-level evidence; no upload, workflow token, production setting, DNS, cloud identity or database call.
- 373: review-stage tests prove missing dependencies deny output; copying is restricted to vetted paths; cross-root staging and backend leakage are denied.

### Why the security-script exception is necessary

The first dependency test failed because the manifest policy denied the existing assets/js/security directory. All eight security modules actually existed in the repository and were referenced by dashboard.html. Removing them would break the application and weaken security. The approved correction preserves these exact browser security files, not any backend security or confidential configuration.

## Acceptance before Pages replacement

| Gate | Required sign-off | State |
|---|---|---|
| Source and dependency tests | DevSecOps + QA, exact source revision | IN CI |
| Staged snapshot file list and SHA-256 hashes | DevSecOps | REPRODUCIBLE REVIEW ONLY |
| Remote libraries and CSP/SRI | Security | NEEDS INDEPENDENT REVIEW |
| Full JS dynamic references, CSS imports and runtime resource dependencies | Frontend + QA | NOT ATTESTED |
| End-to-end login, onboarding, dashboard, recipients, cards and balance UX | QA on real desktop/mobile browsers | NOT TESTED |
| Accessibility and mobile compatibility | QA / UI | NOT TESTED |
| Existing Pages source, protected environments and branch settings | GitHub owner | NOT VERIFIED |
| Unauthenticated HTTP public file checks and incident assessment | Independent Security | NOT VERIFIED |
| Rollback and approved deploy change | Founder / Release Office | PENDING |
| New static-only Pages artifact deployment | DevSecOps | NOT PERFORMED |

## Controlled release sequence

1. Collect exact GitHub Settings > Pages, Environments, Rules and Branches, and preserve the existing Pages run, published artifact ID, hashes and operational rollback instructions.
2. Capture sanitised unauthenticated HTTP evidence for actual Pages routes; do not distribute sensitive source contents in a public report.
3. Run all account/ledger and static site checks on one immutable commit and record their workflow IDs.
4. Generate a frontend-only review directory through the audited stage function and compare every included file hash against the reviewed source commit.
5. Perform real browser functional, responsive, keyboard/screen-reader and security smoke tests against the staged output. Verify external QR dependencies and dynamic JS references separately.
6. Prepare an exact Pages Actions workflow and deployment PR with narrowed permissions, independently verified pinned Action SHAs, protected environment and approved rollback; **do not deploy the review artifact accidentally**.
7. Obtain Founder approval of the final workflow diff and release evidence, then perform the separate controlled Pages change. Confirm backend URLs are unavailable on the published origin.
8. After release, verify incident/credential exposure assessments, public file list and full regression; rollback if any key user journey fails.

**Explicit boundaries:** The current source modules stage files only for inspection. Existing Pages publishing automation may still rebuild and deploy the branch-root website after ordinary commits; these commits do not replace that automation. No approval of live account switching, fiat/crypto transfers or database privileges is implied.
