# PAY54 — P0 GitHub Pages containment decision and verification playbook

**Implementation:** 512  
**Finding:** PAY54-SEC-P0-PAGES-ARTIFACT-20261116  
**Scope:** Operational approval process only; not an executed production change  
**Current decision:** NO-GO / production release BLOCKED

## Direct evidence established

An actual Pages `github-pages` build artifact from GitHub Actions run `43917703697`, artifact `14252395793`, source SHA `9fa996bd385b6714087038306a6532e8e7e5ff14` was inspected read-only. The nested tar contained 616 regular files, including **348 `backend/` files, 150 `docs/` files and 1 `infrastructure/` file**. This is a confirmed violation of the static-site publication-package boundary.

The archive inspection by itself does not prove that the files are currently reachable at a Pages URL. A bounded credential-marker scan identified one private-key header marker inside a backend test file; this is a security review input, not proof of a usable private key or credential compromise.

## Immediate Security and Founder review

1. Identify the **currently active** Pages deployment, build source and upload directory using GitHub Settings → Pages, deployment environment and workflow history. Preserve exact UTC timestamps, commit SHAs, run IDs, artifact IDs and archive SHA-256 values.
2. With authorised security oversight, review a bounded, evidence-derived set of internal URLs. Prefer HEAD metadata first, then only approved minimal content-hash matching if required. Do not expose private source bytes in PRs, customer conversations, public logs or issue comments.
3. If public retrieval is established, determine content sensitivity, exposure duration, customer/provider impact and required notification/credential rotation with Legal and Security. Do not automatically infer compromise from a test fixture or bare header marker.
4. Have the Founder and Security owner decide whether temporary site restriction or suspension is proportionate to the observed risk. Any change to Pages configuration, branch rules, credentials or deployment is an **independent operational approval**, not part of this source-only batch.
5. Preserve a known-good website/rollback approach, login/navigation smoke tests and customer support messaging before a production containment change.

## Restricted publication remediation acceptance

A replacement static-site artifact must be generated only from the reviewed PAY54 candidate list, copied into an isolated empty staging directory, verified byte-for-byte with SHA-256 manifests and inspected with the publication-tree, archive-member, external dependency, source-marker and scope policies. Uploading the repository root or any `backend/`, `docs/`, `infrastructure/`, `tests/`, `.env`, backup file or sourcemap is prohibited.

The authorised deployment owner must independently verify the **actual artifact** and deployment settings. Source-only policy PASS does not constitute production verification. The site must pass mobile/desktop, accessibility, authentication boundary, asset load and rollback smoke tests against the precise intended release SHA.

## Separate fintech launch boundary

Even a safely deployed website does not enable real money. PostgreSQL tenant RLS, authenticated Personal/Business boundaries, ledger and reconciliation integrity, KYC/AML, safeguarding, UK–Nigeria partner permissions, fraud/sanctions screening, support and dispute processing require independent acceptance.

## Evidence and decision register

| Item | Evidence owner | State |
| --- | --- | --- |
| Artifact package overbroad | Security / DevSecOps | CONFIRMED |
| Live internal-file URL reachability | Security | UNVERIFIED |
| Sensitive-content or credential exposure | Security / Legal | UNVERIFIED |
| Current Pages configuration and active artifact | DevSecOps | UNVERIFIED |
| Approved containment route and rollback rehearsal | Founder / Release | NOT APPROVED |
| Restricted static candidate and source tests | Engineering | SOURCE ONLY |
| Real customer journey and fintech launch acceptance | QA / Compliance | NOT VERIFIED |

**Release action:** No automatic deployment, no merge of review PRs, no account-context activation and no customer money movement. Keep P0 OPEN until independently verified and owner-approved risk treatment is complete.
