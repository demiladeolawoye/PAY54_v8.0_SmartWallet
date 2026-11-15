# PAY54 Batch 01 — 07: CI Identity and Deployment Path Audit

**Assessment:** Read-only inspection of committed `project-titan` workflows; not a GitHub administrative permission audit.

## Examined workflows

- `.github/workflows/pay54-staging-deploy.yml`: preparation only; `contents: read`, `TF_VAR_authorized_provisioning=false`, `PAY54_STAGING_EXECUTION=DISABLED`, `PAY54_FINANCIAL_EXECUTION=false`; no cloud authentication or apply step observed.
- `.github/workflows/pay54-staging-infrastructure-tests.yml`: `contents: read`, Terraform fmt/init-backend=false/validate and Node security tests; no Terraform apply/destroy; no credentials requested by this workflow.
- `.github/workflows/pay54-staging-network-policy.yml`: read-only Node source policy, no cloud execution.
- `.github/workflows/pay54-stg05-provisioning-safeguards.yml`: independent source-only regression test, read-only GitHub token.

## Required prohibitions

Any new workflow granting `id-token: write`, reading production secrets, authenticating to Google Cloud, enabling providers, issuing Terraform apply, or deploying Cloud Run must be treated as a new high-impact change requiring fresh security review and explicit approval. Workflow path filters alone do not prove absence of bypass paths; protected branches, reusable workflows, default GitHub token permissions and organisation policies must be independently verified.

## Open risks

1. Admin-controlled branch protection, repository collaborators and environment reviewers were not independently attested.
2. Workflows may reference floating third-party action tags rather than immutable SHAs; future supply-chain review should pin actions where operationally supported.
3. GitHub Pages is a distinct public website deployment path. Its successful runs do not demonstrate regulated staging readiness or backend deployment.
4. Security workflow success signifies source checks passed, not approval or enforcement in Google Cloud.

**Outcome:** REVIEW_ONLY, NO_DEPLOYMENT_AUTHORITY.
