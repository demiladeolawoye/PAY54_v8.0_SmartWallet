# PAY54 — GitHub Pages publication containment and release acceptance

**Implementation:** 415  
**Accountable owners:** Founder, DevSecOps, Security, QA and Release Manager  
**Decision:** Source-only operational runbook; NOT an instruction to change the live site  
**Release status:** BLOCKED until independently evidenced acceptance

## Evidence and classification

The public GitHub repository and the GitHub Pages website are separate publication surfaces. Earlier Actions build logs listed `backend/` alongside public HTML/assets in a Pages upload candidate. This proves that the build inventory was overbroad; it does **not** prove a particular backend URL was accessible, that its returned bytes matched backend source, or that any credentials were exposed.

Before a change, capture the repository/branch SHA, Pages publishing source (Settings → Pages), workflow and job IDs, deployment URL, artifact ID and inventory, observed response status, UTC timestamps, and evidence owner. Store screenshots or sensitive findings privately, never in the public repository or PR comments.

For each suspect path, classify evidence as one of: **in build artifact**, **HTTP response only**, **content matched (authorised inspection)**, **public repository source only**, **not reachable for sampled path**, or **unverified**. A 2xx HEAD response cannot establish matching file content. A sampled 404 does not prove the overall site safe. A failed request is inconclusive.

## Approved read-only review sequence

1. Inspect **Settings → Pages**, the publish source and selected branch/folder or Actions environment; record protection, HTTPS and custom-domain settings without modifying them.
2. Inspect Pages workflow upload roots and Actions logs; identify whether packaging starts from repository root rather than an explicit static directory. Inventory files and exclusions. Record the independent evidence for each finding.
3. Inspect branch rulesets, required reviews and deployment environment restrictions independently; administrator permissions do not prove branch protection.
4. Run the restricted candidate inventory and its HTML/CSS dependency, source-marker, external-script and content-hash reviews in isolated test execution. Review the candidate list for scripts imported dynamically and runtime fetches (not fully covered by static regex scanning).
5. Have the Security owner explicitly authorise any HEAD-only public checks against an evidence-derived bounded path list. The helper `backend/governance/pay54-pages-public-header-probe.mjs` does not execute on import; it is not a substitute for evidence of deployed artifact bytes.
6. Escalate confirmed publicly retrievable sensitive materials under the incident-response process. Minimise further access. If compromised credentials are suspected, arrange separate approval and controlled rotation/revocation, preserve audit evidence and assess notification obligations with legal counsel.

## Proposed containment (requires separate approval)

A. If immediate risk warrants it, the Founder and Security owner select the appropriate temporary site restriction or suspension, documenting user impact, exact scope and rollback.

B. Use a dedicated restricted output directory, produced only by the local candidate staging builder after all source checks pass. Never use the repository root as a Pages upload directory.

C. Verify every staged file against its source content SHA-256 manifest. Independently inspect actual deployment artifact contents before publication. Confirm backend, infrastructure, private documentation, secrets, backup artifacts, source maps and test fixtures are absent.

D. Require a protected release environment, least-privilege identity/OIDC, explicit required PR checks and immutable dependency provenance. Do not create deployer credentials or activate cloud resources through this runbook.

E. Perform linked asset and dynamic import checks; browser-based mobile and desktop QA; authentication/session behaviour review; accessibility checks; no-regression smoke tests; rollback rehearsal; and a security owner review of third-party CDN integrity and host configuration.

F. Submit evidence and final release decision to the Founder. Only after approval, apply the reviewed Pages settings/workflow changes through a separate controlled change and confirm actual HTTP results against expected site resources. Monitor and record post-deploy verification.

## Mandatory release evidence matrix

| Gate | Required evidence | Current state |
| --- | --- | --- |
| PAGES-01 source configuration | Owner-confirmed Pages source and upload path | NOT VERIFIED |
| PAGES-02 artifact boundary | Actual Pages artifact inventory excludes internal paths | NOT VERIFIED |
| PAGES-03 public reachability | Authorised content-level confirmation for suspect URLs | NOT VERIFIED |
| PAGES-04 source dependencies | Complete reviewed HTML/CSS/runtime asset graph | PARTIAL SOURCE CHECKS |
| PAGES-05 secrets and CDN | Independent exposure and provider integrity review | PARTIAL SOURCE CHECKS |
| PAGES-06 GitHub controls | Branch rules, reviews, deployer and environment permissions | NOT VERIFIED |
| PAGES-07 user journeys | Mobile/desktop, auth, accessibility and linked-assets regression | NOT VERIFIED |
| PAGES-08 rollback | Documented, exercised recovery with retained known-good artifact | NOT VERIFIED |
| PAGES-09 approval | Separate Founder + Security + Release decision | NOT GRANTED |

**Go/no-go:** Any missing evidence means NO-GO for a production publication change. No real-money, account switching, database access, partner integration, or private staging is enabled by this document.

## Decision and rollback record

For an approved change, record: change ID, reviewer identities, SHA, exact Pages source before/after, artifact digests, acceptance test results, risk treatment, deployment time, verification URLs, incident contact, rollback trigger, recovery approach, and a signed owner approval. A failed smoke test, missing asset, unexpected internal file or anomalous 5xx must trigger the previously rehearsed rollback or containment decision.

**Present state:** Continue source-only development. The production publication risk P-01 remains OPEN; no breach or safe state has been independently established.
