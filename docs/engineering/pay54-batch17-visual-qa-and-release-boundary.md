# PAY54 — Batch 17 Visual QA and Pages Release Boundary

**Founder approval:** 2026-11-16  
**Validation revision:** `3b4106cfd1539ae0c162d3c23ad522335d28099e`  
**Disposition:** Balance presentation visually ACCEPTED FOR REVIEW; **production release BLOCKED**

## Scope and observed root cause

The founder's publicly displayed PAY54 dashboard omitted four content blocks already present in the source HTML. The approved dashboard blueprint script previously set `hidden` or `p54b-conceal` on balance metadata, movement, identity and compliance status. The repair restores the four existing DOM blocks, preserves the canonical wallet amount and action elements, and adds responsive layout styles without changing any financial backend or ledger.

Values displayed in the QA fixture are synthetic: `₦1,250,000.50`, daily change `+₦24,500`, `3001234567`, `@pay54-user` and KYC Level 2. Each trust/security/KYC and movement claim is marked **not verified**. The public-preview claims guard continues to enforce demonstration wording.

## Browser evidence from exact review commit

GitHub Actions isolated Chromium QA run `43963717157` on commit `3b4106cfd1539ae0c162d3c23ad522335d28099e` completed **SUCCESS**.

The independent screenshot-only archive was artifact `14275592537`, digest `sha256:e5d3098912771385d72925379db8a775b59af0bbfb25b210a3c871d4461ecc38`. Screenshots: `desktop.png` at 1440×1000, `tablet.png` at 768×1024, and `mobile.png` at 390×844.

The isolated fixture loads the reviewed original dashboard HTML, CSS and blueprint presentation script, but **removes** authentication, ledger, wallet, cards, payment, partner and service execution scripts. It seeds synthetic wallet data for visual review, never publishes that page, uses a fresh browser profile and prevents outbound network calls.

### Findings

| Test | Result | Evidence/qualification |
| --- | --- | --- |
| Desktop balance detail visibility | PASS | Converted-wallet context, illustrative positive movement, demo account/tag/KYC and compliance disclosure visible in blue card |
| Mobile balance detail visibility | PASS | Four blocks visible inside balance card; no observed clipping at 390px browser screenshot |
| Tablet balance details | PASS | Four blocks visible in blue card at 768px |
| Tablet Money Moves label collisions | FIXED / PASS | Initial screenshot revealed seven action buttons in too-narrow row; tablet media grid now wraps into three columns at 761–900px, four at 901–1150px |
| Browser DOM blueprint mount | PASS | Isolated Chromium `--dump-dom` plus Node acceptance tests verify four unconcealed elements and safe demo labels |
| Existing authentication boundary | NOT BYPASSED | Opening the unmodified app without a session showed the login screen, as expected |
| Account, ledger or payment execution | NOT TESTED | Intentionally absent from synthetic visual fixture |
| Screen-reader and complete WCAG audit | NOT CERTIFIED | Requires separate real interactive browser/accessibility assessment |
| Live public GitHub Pages deployment | NOT CHANGED | Review branch is unmerged; no operational Pages settings modified |

### Exact CI regression results

All **12/12 GitHub Actions workflows** associated with validation commit `3b4106cfd1539ae0c162d3c23ad522335d28099e` completed **SUCCESS**, including the balance visibility suite, isolated Chromium visual QA, publication governance and account/security suites. Later documentation-only commits require separate exact-SHA CI reconciliation.

## Site-staging security finding

The existing restricted static publication staging builder refused to package the site's candidate assets with `PAY54_STAGE_PUBLICATION_BOUNDARY_DENIED`. Read-only diagnosis isolated `assets/js/infrastructure/payments/providers/linked-card-development.js`, a **development-only linked-card simulation** located under a directory path that the publication policy expressly rejects.

This refusal is intentional and was **not bypassed or weakened**. The candidate currently has a production-publication blocker until the development-only provider's disposition and its dependent front-end integration are independently reviewed. Relocating or excluding it in a real deployment must preserve existing approved functionality and be accompanied by end-to-end tests; no speculative production payment authority is implied.

A separate, previously verified historical GitHub Pages upload artifact `14252395793` included `backend/`, `docs/` and `infrastructure/` source. The actually active Pages source/settings, current deployed artifact, public internal-file reachability and any sensitive-data impact are **not independently verified**. P0 remains OPEN.

## Required release decision sequence

1. **Security + DevSecOps:** Obtain signed-in read-only evidence of GitHub Pages source configuration, active deployment and permitted publishing branch, and determine if historic internal source paths are currently publicly reachable; evaluate any sensitive content privately.
2. **Frontend + Security:** Resolve the development-linked-card provider's location and verify no disallowed paths are in a strictly reviewed site output without bypassing publication policy.
3. **QA:** Re-run exact reviewed site/browser/device tests, verify login routing and fail-closed public-preview action gates, check keyboard and screen-reader access, and verify rollback readiness.
4. **Release Manager + Founder:** Independently approve only the exact reviewed commit, restricted output digest and least-privilege deployment identity after P0 treatment is accepted.
5. **Post-deployment QA:** Verify actual Pages artifact, inspect the public balance card, confirm mobile/tablet/desktop display and restore a known-good release if any regressions occur.

No deployment, repository merge, branch rules, IAM, real-money operations, production credentials, user accounts or databases were altered by this QA cycle.

**Go/no-go:** **NO-GO** until current Pages publication evidence, P0 risk treatment, restricted artifact verification and separate deployment approval exist.
