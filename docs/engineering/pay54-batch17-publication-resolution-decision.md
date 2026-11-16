# PAY54 — Batch 17 publication blocker resolution and operational decision

**Implementation:** 614  
**Source scope:** Items 568–617 (targeted dashboard repair plus publication controls)  
**Status:** SOURCE IMPLEMENTATION IN REVIEW; LIVE RELEASE NO-GO

## Current findings, with evidence boundaries

The corrected wallet balance card and tablet Money Moves layout were tested through the isolated Chromium visual fixture at desktop, tablet and mobile sizes. The real dashboard's anonymous session still redirected to the login page. This validates layout, not authenticated customer financial journeys.

A source-only static publication audit found `assets/js/infrastructure/payments/providers/linked-card-development.js` referenced by `dashboard.html`. That module is explicitly a development provider for simulated linked-card funding and is not a contracted production acquiring/issuing infrastructure provider. The public-site manifest now excludes `infrastructure`, `infra` and `terraform` path segments; this leaves a known unresolved HTML reference and therefore correctly blocks publishing. The wallet/card funding adapter is designed to fail closed when a provider is absent; **do not remove or relocate its development provider in the public website without full feature and funding regression review**.

Separately, a historical GitHub Pages build artifact was directly verified to include backend, documentation and infrastructure source. That is a confirmed *artifact packaging failure*. The current active deployment's source, any real public-file retrieval, sensitive-content impact and live GitHub Pages settings are **not independently established**. No credential compromise can be asserted from that evidence alone.

## Technical choices requiring approval and acceptance

| Decision | Proposed approach | Blocking acceptance |
| --- | --- | --- |
| Development linked-card funding | Keep the current provider available only in nonpublic synthetic development. For any public candidate, require an approved production funding provider or explicitly turn linked-card funding off through reviewed capability and UI gating | Approved feature/provider decision; adapter fail-closed and UI regression tests; dependency graph complete |
| Static site publication | Use existing restricted public manifest, source HTML/CSS graph review, SHA-256 staging and independent artifact tree validation | No `backend/`, `docs/`, `infrastructure/`, private keys, source maps, credential or backup paths; exact artifact SHA attestation |
| Live Pages exposure investigation | Repository owner or authorised Security/DevSecOps reviews Settings → Pages, current deployment environment, Actions source run/artifact and a bounded authorised public path sample | Actual settings and deployed artifact evidence, no copied confidential source or credentials in public issues |
| Security impact and containment | Security assesses any confirmed current URL access and whether sensitive material is involved; Founder/Release approves proportionate restriction, remediation and rollback | Written incident classification and independent control decision; no inference from a sampled 404 or HEAD-only success |
| Release account | Protect the deployment environment, use separated deployer identity/least privilege and verify branch protection | Evidence of active settings and permitted deployer; no long-lived personal credentials |
| Customer-visible replacement | Validate mobile, tablet and desktop screenshots, unauthenticated redirects, tested synthetic preview disclosures, real approved sandbox account journeys, keyboard/screen-reader behavior and rollback | QA + Security + Founder acceptance of the same exact commit and staged output |

## Release sequence

1. Gather **read-only** evidence of active Pages source, latest successful deployment and actually published archive. Evidence fields: repository, site URL, UTC timestamp, workflow/run ID, commit SHA, artifact ID and digest, configuration source, and independent reviewer.
2. Determine whether any nonpublic-source path is currently accessible, and whether any content merits containment, credential rotation or legal notification. Do not publish evidence contents.
3. Resolve the development linked-card provider's *actual feature* disposition with a contracted provider, or obtain explicit approval to disable that funding pathway for a restricted public preview. Preserve every unrelated working payment feature.
4. Generate and independently verify the complete, restricted static asset package; compare the exact candidate and upload archive bytes and validate asset references.
5. Rehearse rollback to a known-good build, then obtain a separate Founder/Security/Release approval for the precise deployment SHA and protected deployer.
6. Only then deploy and perform post-deployment verification of the wallet card, navigation, login boundary and public artifact. **Production money movement requires entirely separate partner, safeguarding, KYC/AML, account RLS, fraud and settlement acceptance.**

## Current authority

The present founder approval authorises engineering changes and read-only investigation. It is **not** permission to bypass security policy, silently remove a working linked-card pathway, change Pages settings, rotate credentials or deploy an unverified root repository package.

The GitHub connector can review repository source, tests and Actions artifacts but does not provide an independently verified current GitHub Pages Settings view through the available operations. The public Pages API check could not be retrieved in this environment. Therefore no live configuration acceptance or publication authority is recorded.

**Decision: NO-GO for live Pages replacement until the separately assessed gates above pass.**
