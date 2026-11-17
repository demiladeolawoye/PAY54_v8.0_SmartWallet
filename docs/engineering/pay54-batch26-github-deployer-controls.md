# PAY54 Batch 26 / 1057 — Protected Deployer and GitHub Release Controls

**Current state:** authenticated repository branch protection, Pages Settings, environments and effective cloud OIDC/IAM remain independently unverified. No setting was changed.

## Required controls

The designated protected default branch and release branches must enforce mandatory PR review, CODEOWNERS for security/infra/payments, exact-head CI, no unreviewed pushes and tightly audited administrator bypass. Every privileged workflow needs pinned immutable action SHAs and narrow `permissions`. Public Pages publishing must accept **only a reviewed static artifact**, never checkout root.

Staging and production GitHub environments require distinct approvers, restricted branch/tag deployment rules, logged approval, and no shared production secret with CI. Google Cloud federation must bind immutable repository ID, owner ID, workflow_ref, branch/environment and correct audience. Use workload identity; do not issue persistent JSON service account keys.

Separate runtime principal, database migration principal, backend issuer, account read/rotation and web deployer. The deployer must never read payment card tokens, customer session records, raw credential secrets or ledger DML. Record actual effective cloud IAM and ensure no public `allUsers`/Owner/Editor path exists.

Rollback requires a known-good independently signed artifact, exact source SHA, protected workflow evidence and a live domain verification. An inaccessible GitHub API endpoint is **NOT_VERIFIED**, not evidence of protection.

**Release decision:** CR-DEPLOY-01 P0 open. Production NO-GO.