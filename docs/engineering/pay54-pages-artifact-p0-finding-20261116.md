# PAY54 — Confirmed GitHub Pages artifact boundary failure

**Finding ID:** PAY54-SEC-P0-PAGES-ARTIFACT-20261116  
**Implementation:** 477 · **Severity:** P0 release blocker  
**Evidence acquisition:** 2026-11-16, read-only GitHub Actions artifact retrieval  
**Disposition:** Production release BLOCKED; live impact NOT YET CONFIRMED

## Evidence source

The GitHub Actions run `43917703697` on `project-titan` produced a `github-pages` artifact. GitHub reported artifact ID `14252395793`, 1,148,828 ZIP bytes and archive digest `sha256:3ef9b7d42cde59d187ee6e9730ea351e8c3a025a796f618d9d230f93c3de1448`. The workflow source commit was `9fa996bd385b6714087038306a6532e8e7e5ff14`. The artifact was created 2026-11-16T17:22:55Z.

The downloaded archive contained a nested `artifact.tar`. Read-only metadata inspection of the tar members (without extracting source content or publishing any file contents) established:

| Category | Count of regular files packaged |
| --- | ---: |
| All regular files | 616 |
| `backend/` | 348 |
| `docs/` | 150 |
| `assets/` | 106 |
| `infrastructure/` | 1 |
| Other top-level files | 11 |
| Total regular-file bytes | 5,485,859 |

The artifact contained **664 total tar entries** including directories. At least 348 backend files and 1 infrastructure file were inside the proposed Pages publication package. Multiple SQL, MJS, MD and other development artifacts appear by file extension; no claim about their content, secrets or suitability is made without independent review.

This is **direct evidence that the publication package exceeded the intended static-site source boundary**. A successful Pages workflow does not establish site safety.

## Not established by this evidence

- Whether any individual packaged internal file is currently retrievable from the public Pages URL.
- Whether GitHub Pages actually published every path in this tar or whether a later deployment replaced it.
- Whether any actual credential, PII, financial data or commercial secret was exposed.
- Whether a reportable incident or customer impact occurred.

The repository itself is public; its GitHub source visibility and the website's Pages reachability must be assessed separately.

## P0 containment proposal — separate operational approval required

1. Security and Founder independently inspect live GitHub Pages settings, active deployment SHA and deployed artifact.
2. If public retrieval or sensitive disclosure is confirmed, initiate the PAY54 incident process and approve proportional temporary containment. Preserve non-sensitive evidence, do not exfiltrate confidential content.
3. Independently review secret/key rotation requirements, partner agreements and notification obligations based on observed content and actual risk.
4. Replace any root-based Pages packaging with a strictly bounded reviewed static-site output only after explicit change approval, mobile/desktop regressions and rehearsed rollback.
5. Apply GitHub environment protection, read-only CI validation, deployment identity separation and owner approval gates before restoring public publication.

**No Pages settings, branch rules, credentials, database privileges, customer accounts, production financial operations or live deployments have been modified by this finding.**

## Verification gap and owners

| Gate | Owner | Status |
| --- | --- | --- |
| Actual current Pages source and active deployment | DevSecOps | NOT VERIFIED |
| Current live public internal-file reachability | Security | NOT VERIFIED |
| Actual content sensitivity and incident scope | Security + Legal | NOT VERIFIED |
| Restricted publishing output and deployment change | Release + Frontend | PROPOSED, NOT APPROVED |
| Device, accessibility, payment and account regressions | QA + Security | NOT VERIFIED |
| Founder release and containment approval | Founder | NOT GRANTED |

**Conclusion:** Confirmed overbroad artifact packaging. Live exposure and impact are unknown. Continue source-only remediation and preserve production release BLOCKED.


## Additional offline marker scan — value-free summary

The downloaded artifact was scanned offline for five high-confidence marker classes: private-key headers, GitHub classic/fine-grained token formats, AWS access-key IDs and a live-secret prefix. **One private-key header marker** appeared in the packaged backend test fixture `backend/tests/account-batch11-proposed-site-content-review.test.mjs`. No matching file was identified for the other scanned classes.

The matching path is a test file, so this is **not evidence that a usable signing key exists or that credentials were compromised**. The marker was not printed, exported or included in the repository. Security must independently determine whether the fixture is synthetic and whether other unscanned credential formats or sensitive configuration values were included. This bounded scan cannot certify absence of secrets; the overbroad Pages package remains confirmed and P0 OPEN.

The artifact's actual website reachability and active deployment version remain unverified.
