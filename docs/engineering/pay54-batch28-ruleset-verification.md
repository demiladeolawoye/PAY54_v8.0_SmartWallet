<!-- PAY54 Batch 28 / 1234 -->
# PAY54 CTO — GitHub Branch Ruleset Save Confirmation and Required Checks

**Date:** 17 November 2026
**Source:** Founder screenshots plus authenticated read-only GitHub repository ruleset and workflow-run endpoints.
**Scope:** Release governance evidence only; no branch rules were activated or changed programmatically.

## Verified saved GitHub ruleset

- Repository: `demiladeolawoye/PAY54_v8.0_SmartWallet`
- Ruleset name: `PAY54 Enterprise Branch Protection`
- Ruleset ID: **27496881**
- Target: branch
- **Enforcement: DISABLED**; this configuration therefore does not yet enforce protections.
- Includes: `~DEFAULT_BRANCH` (currently `main`) and exact `refs/heads/project-titan`
- Bypass actors: empty
- Rules saved: `deletion`, `non_fast_forward` and `pull_request` (0 approving reviewers, no code-owner/recent-push approval, merge/squash/rebase allowed)
- **No required-status-checks rule is present**.
- Additional Copilot unattributed change approval is disabled.

This resolves verification of **ruleset creation only**; CR-DEPLOY-01 remains P0 OPEN because nothing is enforced and independent reviewers/required CI/deployer permissions are not yet configured.

## Confirmed latest Batch 28 PR-head workflow results

GitHub PR #16 head at the time of inspection: `827881b83e0336c6a64a6506eb1fa4099654380a`.

All **10 associated workflow runs completed SUCCESS**, recorded by read-only GitHub commit workflow endpoint:

1. PAY54 Account Security Integration
2. PAY54 Account Boundary Tests
3. PAY54 Batch 28 Integration and Safe Preview
4. PAY54 Batch 10 Synthetic Role and Audit Source Tests
5. PAY54 Account Authentication and RLS Integration
6. PAY54 Account Read Access Integration
7. PAY54 Batch 07 Account Security Integration
8. PAY54 Batch 09 Account Actor and RLS Integration
9. PAY54 Account Catalogue and Isolation Integration
10. PAY54 Batch 08 Authenticated Actor Integration

**Warning:** Workflow display names are NOT sufficient to select GitHub's exact required status-check context. For matrix or multi-job workflows, the required check is the GitHub Checks job/context name (and optionally pinned trusted source app). A successful **draft PR** check against Batch27 does not prove that the same job executes for PRs targeting `main` or `project-titan`. A `paths`-filtered, branch-filtered or absent job can leave a required check Pending indefinitely. Never select all ten wholesale without validating target-branch coverage and actual job contexts.

## Activation acceptance sequence

1. Read the relevant workflow YAML files and extract the actual job IDs, branch/event/path filters and pinned Actions. Identify an always-running minimal **source security / regression** workflow that explicitly supports PRs targeting both `main` and `project-titan`.
2. Confirm the check runs with identical required job/context names for an approved representative PR targeting each protected branch; run an isolated test PR if necessary. Required checks must be chosen by exact successful GitHub UI Checks name.
3. Keep the ruleset DISABLED until tests demonstrate no deadlocks or branch lockouts. Verify your account has available independent reviewers; 0 approvals is only a temporary non-production compromise.
4. Recommended future required contexts: a stable repository-wide source security check, anti-secret scanning, fundamental lint/test/typecheck; account/RLS/ledger tests should be required when their branch and triggers are actually wired to execute reliably.
5. When those checks work, enable the required-status-check rule, set exact trusted contexts, add independent reviewer protections when staffed, and obtain Founder/Security/Release approval **before** changing enforcement to Active.
6. After activation, verify GitHub ruleset API reports `enforcement: active` and verify a PR cannot merge without the configured controls. Protect against bypass, deletion and force-push by actual adversarial testing in a safe, nonproduction test setup.

## Separate website exposure status

Founder recording shows successful **Unpublish site** action for the former `project-titan` → `/(root)` GitHub Pages publication. The repository itself remains PUBLIC, and historical source/secret exposure and Pages CDN propagation remain unverified. Never republish unsafe repository root. Review only the isolated two-file preview offline until separately approved.

**Security verdict:** Ruleset saved with correct targets and restrictions but inactive. **PAY54 production NO-GO.**


## Inspected workflow definitions — reason status checks are not ready

Source inspection on the same Batch 28 branch confirms:

| Workflow | Actual job context | Trigger limitation |
| --- | --- | --- |
| `pay54-account-security-integration.yml` | `integrated-account-security` | `pull_request` is filtered by selected backend paths; unrelated changes skip it |
| `pay54-account-boundary-tests.yml` | `Account Authorization and Isolation` | `pull_request` is path-filtered; unrelated changes skip it |
| `pay54-backend-tests.yml` | `Backend Foundation and Domain Tests` | `push` to `project-titan` or manual dispatch only; **no `pull_request` trigger** |
| `pay54-batch28-integration-preview.yml` | `source-only-acceptance` | PR branches are restricted to Batch27 and `project-titan`, and paths are filtered; it is not generally available on `main` |

**Decision:** None of these existing jobs is currently suitable as a universal required status check on *both* protected branches. Adding them now can produce permanently pending PR checks. A new branch-neutral, always-running security baseline should be designed, tested on `main` and `project-titan`, and merged under a reviewed non-deploying process before it is required in the ruleset. The workflow cannot be considered effective simply because a source file exists on an unmerged Draft PR branch.

Do not activate the ruleset assuming the current status-check protection is operational. Activation of its present PR/deletion/force-push protections without a required check would provide some limited defence, but still would **not** satisfy PAY54's production release policy.
