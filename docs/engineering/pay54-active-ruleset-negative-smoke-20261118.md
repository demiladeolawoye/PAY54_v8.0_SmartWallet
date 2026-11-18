# PAY54 active ruleset negative smoke — 18 November 2026

This document-only pull request tests GitHub branch protection on `main`.

## Safety constraints

- No independent approval will be submitted to this pull request.
- The PAY54 Protected Branch Security CI job may run, but no deployment may be initiated.
- Inspect GitHub pull request merge status to confirm whether an unapproved PR is blocked.
- Do not merge. Close this PR unmerged after collecting evidence.
- No changes to application, authentication, payments, infrastructure, workflows or live data.

## Expected result

An active ruleset requiring one independent approval prevents merging this PR even if its security CI passes. If it is not blocked, treat the configured ruleset as insufficient and stop protected-branch activity until the enforcement gap is investigated.
