# PAY54 Batch 11 — Item 296: GitHub Actions Supply-Chain Hardening Decision

**Date:** 2026-11-16
**Repository:** demiladeolawoye/PAY54_v8.0_SmartWallet
**Status:** SOURCE AUDIT COMPLETE; SECURITY CHANGE REQUEST OPEN
**Deployment:** NOT AUTHORISED

## Verified source concern

The existing staging validation workflow `.github/workflows/pay54-staging-deploy.yml` references `actions/checkout@v7` and `actions/setup-node@v7`. The committed source audit `backend/governance/pay54-actions-dependency-audit.mjs` recognises these as mutable version tags rather than immutable commit pins. A mutable tag can be reassigned upstream, so it does not uniquely establish third-party action source code. No compromise is alleged.

## Change request: CR-SEC-11-01

For each external GitHub Action across the full workflow inventory, resolve an authoritative release tag to its **full immutable commit SHA** from the publisher, record the maintained semantic version in a comment, verify upstream ownership and maintenance history, and use documented, controlled updates. Do not fabricate SHA values. Require code review and CI for each proposed change.

Additional review:
- Minimise workflow/job token permissions and avoid `id-token: write` except approved deployment workflows with trust conditions and protected environments.
- Ensure `persist-credentials: false` on repository checkout in build/validation jobs.
- Confirm dependency integrity and cache safety; avoid privileged `pull_request_target` paths that execute untrusted changes.
- Keep staging validation jobs disconnected from secrets, IAM grants, package publishing and financial execution.
- Audit workflow changes against protected branch/ruleset settings independently, since the available GitHub integration lacks administrative access.

## Acceptance criteria

1. All relevant external action references in controlled workflows use independently verified full commit SHAs; pinned versions remain supported and receive scheduled vulnerability reviews.
2. The source audit detects unpinned and mutable references, including Docker tags and third-party action refs.
3. Repo owner reviews protected branch/rulesets and trusted environment limitations through Settings.
4. Existing backend and staging validation jobs remain green after source changes; no production/cloud release occurs.
5. Independent DevSecOps reviewer signs off and records evidence; no self-asserted GitHub source metadata counts as production approval.

**Current status:** Source-level detection and tests committed. Actual SHA pinning requires independently verified upstream action SHAs and controlled changes. No mutable tag has been replaced with a guessed revision.
