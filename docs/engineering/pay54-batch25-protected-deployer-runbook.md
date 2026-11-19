# PAY54 Batch 25 / 1014 — GitHub Protected Deployer and OIDC Release Procedure

**State:** Read-only governance; no repository settings, deployment, Google Cloud IAM or OIDC identity has been changed.

## Current verification gap

The connected GitHub API returned an empty ruleset inventory in this engineering session, and the branch-protection endpoint was not accessible to the integration (403). Neither observation proves whether branch protection exists or does not exist. The GitHub Pages settings endpoint was also unavailable to the connected reader. A repository administrator and independent security reviewer must verify all three separately.

## Required protections

1. Require PR review and CODEOWNERS for source, backend/security, migrations, workflows and infrastructure, with at least two qualified reviewers for privileged changes. Require exact-head passing checks, linear history or equivalent protected merge, no bypass and audit of administrator override.
2. Separate GitHub environments for development, protected staging and production. Limit staging/production to specifically named approved branches/tags with required independent reviewers and deployment protection.
3. Require a **new, dedicated PAY54 deployer identity** for each cloud environment, separate from runtime, DBA, migration and issuer identities. Use workload identity federation with restricted immutable repository ID/owner ID, exact workflow ref, branch/commit, audience and environment. Do not create long-lived JSON service-account keys.
4. Use the narrowest cloud roles for approved artifact promotion; deny project Owner/Editor, financial datastore access, secret payload read by GitHub workflows and public IAM principals. Store independent DB/login secrets in approved Secret Manager with audited, explicit numeric versions.
5. Publish only a separately reviewed static artifact, not the source checkout. Validate the bundle with `verifyPay54StaticReleaseDirectory`, remove the development card provider and verify public paths, content hashes, active Pages configuration and DNS before switching traffic.
6. Retain signed build provenance, immutable artifact checksum, intended source SHA, reviewer approvals and runbook. Test rollback to an independently known-good artifact without changing ledger or account records; require post-rollback security checks.

## Evidence and change signoff

Capture authenticated GitHub settings snapshots and audit trails, cloud service-account policy, OIDC trust conditions, protected environment approval, SLSA/provenance evidence where available, Pages deployment source and recovery drill. `assessPay54DeploymentEvidenceIntake` can only report structural completeness; independent signatures and effective IAM tests are still required.

**Decision:** CR-DEPLOY-01 P0 OPEN. No GitHub release or production provisioning authorised.