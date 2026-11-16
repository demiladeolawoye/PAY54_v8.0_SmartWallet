# PAY54 Pages Publication Exposure — Evidence and Containment Plan

**Review date:** 2026-11-16
**Branch:** project-titan
**Classification:** SOURCE-VERIFIED OVERBROAD PAGES ARTIFACT / PUBLIC FILE REACHABILITY NOT YET VERIFIED
**Release state:** BLOCKED FOR NEW PRODUCTION OR FINANCIAL SERVICES

## Verified evidence

- GitHub repository metadata states visibility public and default branch main. The connected account has administrator permissions. Repository source is already available publicly independently of Pages.
- Pages workflow run 43913053580 on commit abc5fd241c1999004a0b54f3dd3100f9d651cc5d had successful build, deploy and report-build-status jobs.
- The Pages build log lists files from backend/ and backend/tests alongside website HTML and assets while preparing the Pages artifact, rather than a restricted frontend-only inventory.
- The artifact named github-pages had ID 14247733115, size 1,136,185 bytes, and reported ZIP SHA-256 bb128064c75405d0d7d84c81fff4af39761f623eff915fc1a19711b7df31aba8.
- The Pages deploy job references the same artifact ID and records destination URL https://demiladeolawoye.github.io/PAY54_v8.0_SmartWallet/.
- The repository contains assets/js/dashboard.backup.js and assets/dashboard-lastworking-before scan and pay.js. Repository presence does not prove the individual files are publicly reachable at Pages.
- Live Pages HTTP requests and backend/backup URL probes did not produce usable responses from the available environment. Public reachability has not been verified or disproven.
- GitHub rulesets listing returned an empty list, but branch protection was inaccessible through this connector (403 Resource not accessible by integration). Pages settings could not be independently inspected.

## Priority and accuracy

**P0 for owner review of publication scope and containment planning.** The artifact creation clearly used an overbroad source list. The artifact archive was not directly extracted, so the exact deployed file inventory and individual URL reachability remain unverified. The public GitHub repository itself already exposes committed source; a second web origin alone does not establish leakage of confidential credentials. Never infer a secret compromise without evidence.

## Source-only safer publication inventory

- Existing source-only policy backend/governance/pay54-public-site-manifest.mjs denies backend, .github, docs, secrets, backups, maps and SQL in proposed manifests.
- Added backend/governance/pay54-static-site-candidate-inventory.mjs; this evaluates nine reviewed root app pages plus selected assets/js, assets/css, assets/img, assets/images and assets/fonts, excluding risky file paths. It never copies, deploys or changes settings.
- Added backend/tests/account-batch12-static-site-candidate.test.mjs for real repository candidate paths, backup exclusion, symlinks, oversize and denial conditions.
- The candidate is NOT a complete production site bundle. All linked dependencies, CSS imports, extensionless assets, JS modules, responsive UX, CSP, service-worker references and accessibility need a real build/test before any promotion.

## Founder and DevSecOps actions

1. In GitHub Settings > Pages, inspect source branch/folder or Actions workflow, public URL and publication environment. Review Settings > Environments; Settings > Rules > Rulesets; and Settings > Branches.
2. On a trusted network in an unauthenticated browser, test the site root and representative internal file paths. Log HTTP status, Content-Type and content hash only, not any sensitive source.
3. If unapproved files are publicly accessible, consider an owner-approved temporary unpublication or a replacement using a reviewed static-only release artifact; ensure rollback and prevent functional regression.
4. If sensitive data or credential exposure is confirmed, follow security incident response and revoke/rotate affected credentials through approved channels.
5. Prepare a controlled PR for an allowlisted Pages build, independently verified immutable Actions pins, static dependency checks and complete mobile/desktop QA.
6. Obtain separate release approval before modifying Pages settings, DNS, cloud roles, databases, card/payment rails or production features.

## Exit criteria

Actual published file list and reachability verified; prohibited files absent; required HTML/CSS/JS dependencies intact; reviewed security/rollback and release approvals recorded; no customer funds or credentials introduced.

**Disposition:** OVERBROAD BUILD INPUT OBSERVED; LIVE EXPOSURE UNKNOWN; OWNER REVIEW REQUIRED.
