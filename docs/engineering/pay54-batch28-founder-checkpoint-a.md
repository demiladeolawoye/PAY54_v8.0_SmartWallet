<!-- PAY54 Batch 28 / 1228 -->
# PAY54 CTO — Batch 28 First 40-Action Checkpoint and Operational Change Register

**Approval scope:** Founder-approved Batch28 engineering actions 1188–1307, maximum 120 meaningful actions, with interim 40-action regression checkpoints and early stop when further work needs live access/contract approval.

**Source checkpoint:** Engineering actions **1188–1227** (40 auditable source changes), followed by this independently tracked checkpoint report (1228).
**Review branch:** `cto/batch28-integration-release-hardening-1188-1307`, Draft PR **#16** stacked on Batch27 Draft PR #15.
**Operational decision:** Production **NO-GO**. No live GitHub Pages publishing, source merge, cloud IAM, IdP, PostgreSQL migration, regulated provider, card charge, wallet/ledger posting or FX transaction was performed.

## Verified GitHub branch/release risks

The connected GitHub repository metadata identifies `main` as the **PUBLIC repository's default branch** with `has_pages:true`. `project-titan` and `main` are **diverged**: `project-titan` was 1,786 commits ahead and two commits behind `main` on 17 November 2026. The Batch27 source SHA was 2,687 ahead and two behind `main`. A comparison of `project-titan` and Batch27 showed 901 commits ahead, zero behind. The GitHub compare API returns at most 300 changed files in the observed response and is not an exhaustive audit of the thousands of source changes.

Read-only PR metadata showed **PRs #1–#15 all OPEN/DRAFT/UNMERGED**; this batch added Draft PR #16. The first PR targets `project-titan`, later PRs target the preceding batch branch. No single successful PR result proves that merging this large stack into `main` is safe.

Default-branch-only diff evidence includes `assets/js/recipient.js` and `assets/css/deployment-boundary.css`. Reconcile complete files and effective ancestry before any controlled merge. Independently audit rulesets, branch protections, CODEOWNERS, OIDC, environments and administrator bypass.

## Source work completed in this checkpoint

| IDs | Deliverables | Deployment state |
| --- | --- | --- |
| 1188–1191 | Isolated nonfinancial `public-preview` HTML/CSS, atomic two-file static packaging with reuse of existing artifact security verifier, symlink/hardlink/overwrite tests | OFFLINE only |
| 1192–1197 | Strict stacked draft PR topology checker, bounded fixed-URL read-only GitHub PR evidence collector, negative tests, pinned Batch28 CI, corrected forged-status error boundary | Source + tests only |
| 1198–1205 | Default-branch divergence/300-file-truncation consolidation report and merge-preflight tests, static marketing policy with scripts/external links/form rejection, actual legacy trust-claim audit | No merges |
| 1206–1209 | Correct ineffective HTML-meta `frame-ancestors` directive; document required real HTTP headers; add visible demo disclaimer and truthful KYC/compliance claims to existing index without removing existing scripts/actions | Existing demo preserved |
| 1210–1211 | Harden demo-only auth: per-profile salted PBKDF2-SHA256 PIN verifier, WebCrypto fail-closed, legacy plaintext PIN migration on correct demo login, tests for signup/login/wrong PIN/reset/mock OTP | Not trusted customer auth |
| 1212–1222 | Correct misleading login/signup/PIN-reset/mock-OTP language, preserve forms/callbacks, add accessible labels to all five auth screens, cross-page/source regression tests | Demo only |
| 1223–1227 | Fix source-test constant naming, add source guard against regression to plaintext PIN/bank-grade claims, security threat model and exact-source CI enforcement | No live credentials |
| 1228 | Founder operational/priority/change register and early-stop rationale | Report only |

**Important risk qualification:** A four-digit PIN has low entropy and a salted browser PBKDF2 verifier is **not** bank-grade authentication. Browser-held demo name/email/phone remain local for demo compatibility and must never be treated as verified customer identity. Future production must not migrate demo PINs. Mock OTP remains a demonstration, explicitly labelled.

## Outstanding operational P0/P1 register

| ID | Priority | Status | Next real action | Owner |
| --- | --- | --- | --- | --- |
| CR-MERGE-01 | P0 | OPEN | Review the 16-draft-PR stack, two default-branch-only commits, full merged tree and protected approval path | Enterprise Architecture + Release + Security |
| CR-PAGES-01 | P0 | OPEN | Authenticated GitHub Pages settings, current artifact, public-source history and containment if necessary | Security + DevSecOps |
| CR-WEBSITE-01 | P0 | STATIC CANDIDATE ONLY | Independently approve isolated public-preview artifact, actual hosting HTTP headers, deployed hashes and rollback | Frontend + Security + Release |
| CR-AUTH-DEMO-01 | P0 | SOURCE MITIGATED, NOT CLOSED | Assess real use of browser-held legacy PII/PIN; never use demo credentials in production; secure migration/retention plan | Security + Privacy |
| CR-IDENTITY-01 | P0 | NOT PROVISIONED | Contract trusted IdP/MFA/KYC onboarding, secure API/session issuance and fraud recovery | Founder + Security + Backend |
| CR-DB-01 | P0 | NOT DEPLOYED | Private staging PostgreSQL, canonical 001–020 migrations, four effective roles, RLS tests, PITR and TLS | DBA + DevSecOps |
| CR-RATE-01 | P0 | NOT CONNECTED | Real distributed atomic login limiter and observable failure/replay controls | Security + SRE |
| CR-ACCOUNT-02 | P0 | HTTP 503 | Authenticated Personal/Business selection, atomic session switch and ten-domain customer cache isolation | Backend + Mobile |
| CR-CARD-01 | P0 | DEVELOPMENT PROVIDER | Contract PSP/issuer, PCI/SCA, ledger/capture/refund test; exclude simulator from real financial build | Fintech + Cards |
| CR-FINTECH-01 | P0 | NOT APPROVED | UK inbound + global FX backbone + two Nigerian payout partners; regulated permissions, safeguarding, KYC/KYB/AML | Founder + Compliance + Fintech |
| CR-DEPLOY-01 | P0 | NOT VERIFIED | Protected release branches/environments, OIDC, dedicated least-privilege deployer, verified rollback | Release + DevSecOps |
| CR-QA-01 | P1 | PENDING | Real mobile/browser, WCAG 2.2 AA, offline sessions and tenant leakage QA | QA + UX + Mobile |
| CR-OBS-01 | P1 | PENDING | Monitoring, real incident management, secure audit, recovery/performance SLO evidence | Security + SRE |

## CTO immediate decisions and prioritisation

- **Do not merge all 2,687 commits into `main` as one unreviewed release.** Preserve the two default-branch-only changes and validate the original PR dependency sequence on an isolated, non-deploying integration branch.
- **Do not publish checkout root as Pages.** The isolated two-file marketing artifact is built offline only. Actual public Pages configuration and historical source exposure remain independently unverified.
- **Do not activate or market the client-side demo login as real onboarding.** The PBKDF2 migration limits demo plaintext persistence but does not create a trusted identity.
- **Do not spend on or provision live infrastructure from source CI.** Obtain separate permissions, contracts, independent role/DBA/security reviews and Founder decisions.

**Checkpoint disposition:** Real source hardening work has reached 40 actionable changes plus this status register. The remaining authorised Batch28 IDs are **1229–1307 (79)**; they have NOT been implemented or reported as complete. Source work should resume only for useful integrations rather than duplicate source-only signoff wrappers. The major remaining work depends on GitHub admin verification, staging infrastructure, regulated financial partners and accepted security controls.

**PAY54 production remains NO-GO.**
