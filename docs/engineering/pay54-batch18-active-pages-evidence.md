# PAY54 Batch 18 — Active GitHub Pages Evidence Collection

**Implementation 623** · **Owner:** Security + DevSecOps · **Status:** P0 OPEN
**Purpose:** Establish current GitHub Pages facts before any restricted replacement or containment.

## Evidence already established

The historical Actions Pages artifact `14252395793` (run `43917703697`) was independently inspected and included **348 backend files, 150 documentation files and one infrastructure file** among 616 files. This is an overbroad *artifact* and a publication-boundary failure. It is **not** proof that the active public website currently serves those paths or that customer data or active credentials were disclosed.

In the 16 November 2026 review, unauthenticated attempts to inspect the project homepage and `dashboard.html` through the web checker were not accessible. This is an environmental observation; the founder's browser screenshot demonstrates that a dashboard page could be accessed in their browser. It is neither proof of public unavailability nor proof of safe deployment.

## Required repository-owner observations

Open the following pages **while authenticated as an authorised repository owner**. Record settings only; do not edit them.

| Check | Location | Evidence to capture | Security status |
| --- | --- | --- | --- |
| Pages publication source | `https://github.com/demiladeolawoye/PAY54_v8.0_SmartWallet/settings/pages` | Actions vs branch/folder, custom domain, HTTPS, displayed site URL | Not independently observed |
| Latest successful Pages deploy | GitHub Actions → deployments | Exact run ID, UTC, commit SHA, published artifact ID/digest, environment | Not independently observed |
| Pages environment | Settings → Environments → github-pages | Branch restrictions, required reviewers, deployment protection, authorised deployer identity | Not independently observed |
| Protected branches/rules | Settings → Rules → Rulesets | Branch target, code review, required checks and bypass identities | Not independently observed |
| Public internal-file reachability | Security-approved bounded URL checks | HTTP status, category, timestamp, verified digest if authorised | Not independently observed |
| Sensitive content / response | Security incident review | Confidential impact classification, need for containment, key rotation, communications | Not independently observed |

Use the bounded `pay54.pages-owner-evidence-register.v1` source validator only as a **record-format check**. A complete form is not independent attestation. Keep screenshots in a private security record, not a public pull request or issue, and do not paste credentials or sensitive source.

## Release conditions

1. Identify the actual Pages source and current deployment SHA, artifact and owner.
2. Correlate public source-path responses with the active artifact if authorised; HEAD 200 is not content proof and 404 for a sample path does not prove all internal files are inaccessible.
3. Determine sensitivity privately. Preserve old evidence and record findings; if current disclosure is confirmed, initiate proportionate security-led containment.
4. Resolve the development linked-card funding provider dependency without weakening the forbidden `infrastructure/` publication policy or silently changing working payment features.
5. Independently stage and inspect restricted site bytes, credentials and script graph, verify rollback, and get separate Founder/Security/Release approval for a precise deployment identity and commit.

**No-GO:** Until the active deployment and release package are independently verified, the public website stays unchanged, PRs remain draft, and live money/identity/customer operations remain blocked.
