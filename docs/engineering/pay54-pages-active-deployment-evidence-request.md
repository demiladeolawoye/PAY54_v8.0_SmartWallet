# PAY54 — Active GitHub Pages P0 evidence request and containment decision

**Implementation:** 562
**Status:** P0 OPEN; live exposure UNVERIFIED; source-only security review
**Accountable parties:** Founder, DevSecOps, Security and Release Manager

## Verified starting point

A previously retrieved GitHub Actions Pages publication artifact (run `43917703697`, artifact `14252395793`) contained source files from `backend/`, `docs/` and `infrastructure/`. This proves the old upload package was overbroad. It does not prove those exact files are served by the currently active website or that sensitive content was compromised.

## Read-only evidence to obtain from GitHub

1. Open `https://github.com/demiladeolawoye/PAY54_v8.0_SmartWallet/settings/pages` while signed into the authorised repository owner account. Record whether publication is from Actions or a branch/folder; record the displayed site URL, HTTPS setting and custom domain if present. Do not click Save or change the source.
2. In the repository **Actions** tab, identify the most recent successfully deployed Pages workflow and its exact deployment commit SHA and artifact ID. Distinguish historical `project-titan` deployment from any newer active deployment. Record UTC time and GitHub run URL.
3. In **Settings → Environments → github-pages**, review branch restrictions, required reviewers, deployment protection and authorised identity. Do not change rules or permissions as part of this evidence collection.
4. In **Settings → Rules → Rulesets** or branch-protection settings, review protection on `main` and `project-titan`, including required reviews, required checks, bypass and force-push settings. Record factual settings without claiming enforcement not seen.
5. With explicit Security approval, perform a bounded public reachability check on a few internal paths evidenced by the artifact. Log only HTTP status, path category, timestamp and authorised content digest if content matching is required. Never paste backend source, credentials or customer material in a public issue or PR.
6. Classify results separately: **packaged in artifact**, **confirmed live content match**, **HTTP-only observation**, **sampled path not reachable**, **indeterminate**, and **sensitive data independently confirmed**. A HEAD 200 is not content proof, and a single 404 cannot establish full safety.

## Decision record and operational actions

| Decision | Required owner acceptance | Position |
| --- | --- | --- |
| Whether current Pages publication contains internal source | Security + DevSecOps | UNVERIFIED |
| Whether current internal paths are publicly reachable | Security | UNVERIFIED |
| Whether a usable credential or customer data was exposed | Security + Legal | UNVERIFIED |
| Whether temporary suspension or restriction is warranted | Founder + Security | NOT APPROVED |
| Whether to change the Pages workflow/upload directory | Founder + Release + Security | NOT APPROVED |
| Whether deployment can resume after QA and rollback testing | Founder + Security + Release | NOT APPROVED |

A confirmed exposure requires proportionate incident response, preservation of evidence, private content review, and evaluation of rotation or notifications under applicable obligations. None of those decisions is automated by source-only CI.

## Founder dashboard preview alternative

The reviewable founder dashboard is distributed as a seven-day GitHub Actions ZIP containing only inert HTML, visual CSS/images and a SHA-256 provenance manifest. A standalone offline HTML version is also available in the conversation. No application JavaScript is included, and no public preview website was deployed.

**Never enter real banking credentials, KYC documents or customer information into the unverified public Pages site or offline visual preview.**

## Completion criteria

P0 cannot close until the actual current publication source, active artifact, public reachability, sensitivity, approved containment and retest are independently evidenced. GitHub Actions source-only test success, offline preview generation, or the presence of a read-only runbook does not satisfy these gates.

**Release decision: BLOCKED / NO-GO.**
