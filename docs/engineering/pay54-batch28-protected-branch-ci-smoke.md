<!-- PAY54 Batch 28 / 1240 -->
# PAY54 EEO — Protected Branch Security Baseline: Cross-Target Verification

**Date:** 18 November 2026. **Release state:** DRAFT only; no merge, published website or financial activation.

## Source deliverables

- `.github/workflows/pay54-protected-branch-baseline.yml` — GitHub Actions workflow with stable job context **PAY54 Protected Branch Security**; `pull_request` event targets `main` and `project-titan`, plus temporary Batch27 integration validation; **no `paths` filters**, no privileged `pull_request_target`, read-only `contents: read`, pinned checkout and Node setup, no cloud or deployment actions.
- `backend/release/pay54-protected-branch-baseline.mjs` — security/trigger/source-identity contract: rejects workflows with write permissions, unpinned actions, path filters, deployment commands and mismatched PR head.
- `backend/tests/account-batch28-protected-branch-baseline.test.mjs` — negative-path cases for CI bypasses, trigger omissions, action tag substitution and ref mismatch.

## Independent smoke PR checks — both actual protected targets

The identical three-source-file implementation was copied to **separate disposable draft branches created from the exact starting SHA of each target**. Neither protected branch was changed.

| Base branch | Starting base SHA | Draft PR | Exact PR head SHA | Workflow run | Job context and result |
| --- | --- | --- | --- | --- | --- |
| `main` | `da5ccde9aa269f3cdee23db47efaf9b1e335e1c5` | [#17](https://github.com/demiladeolawoye/PAY54_v8.0_SmartWallet/pull/17) | `1246f9e30414b738d636e06a8c88be81772c3dd7` | [44268446748](https://github.com/demiladeolawoye/PAY54_v8.0_SmartWallet/actions/runs/44268446748) | **PAY54 Protected Branch Security — SUCCESS** |
| `project-titan` | `4e349446edfb8c4ab25203a213af43b6da207b39` | [#18](https://github.com/demiladeolawoye/PAY54_v8.0_SmartWallet/pull/18) | `239c2f6f0c0a485ab44229bb34af41d1d2a2748f` | [44268454922](https://github.com/demiladeolawoye/PAY54_v8.0_SmartWallet/actions/runs/44268454922) | **PAY54 Protected Branch Security — SUCCESS** |

A third exact-name job ran successfully on Batch28 Draft PR #16 against the stacked Batch27 base. The smoke PR tests independently demonstrate that GitHub creates and passes the **same unfiltered job context** for PRs targeting both requested protected branches.

**This does not prove branch-protection enforcement.** Currently GitHub ruleset #27496881 is **DISABLED** and does **not include a required-status-checks rule**. The workflow exists only on draft PR heads and must not be counted as an installed requirement on either base branch.

## Controlled, reviewed promotion plan

1. Independently review the three-file smoke PR #17 and #18; ensure the exact contents match the Batch28 reviewed source and do not modify application business logic.
2. Require separate Founder/Release authorisation before merging either PR. Merge/rebase only after fresh exact-head checks and conflict review, preserving existing `main` / `project-titan` source and unrelated PR stack. **No merge has been performed.**
3. After the workflow has safely landed on both target branches, verify new representative PRs still run the same **GitHub Checks job context**, with no path filters or skip state.
4. In Rulesets → **PAY54 Enterprise Branch Protection** (ID 27496881), edit the rule to add **Require status checks to pass**, select the exact trusted check **PAY54 Protected Branch Security** under the GitHub Actions source, and verify it appears for both targets.
5. Maintain zero approvals only as a temporary single-founder compromise; onboard an independent Security/Release reviewer and require approvals before production. Independently test merge gating and branch deletion/non-fast-forward enforcement after activation.
6. Turn Enforcement **Active** only after verified installation, checks on both branches, least-privilege governance, clear incident/rollback path and explicit Founder approval. Do not enable unsafe root GitHub Pages publication or real banking features during this work.

## Security limitations and next expansion

This baseline is an **always-running gating foundation**, not a comprehensive fintech security certification. Its current checks include source identity, pinned workflow configuration, negative tests, and Git diff whitespace/conflict validation. Existing wallet/ledger/account/RLS integration suites remain separate and should be expanded and stabilised as universally required checks after confirming that the relevant tests run on both target branches. PR-head workflow content can be modified by a contributor; independent review or workflow ownership is necessary before trusting a required job in production.

**P0 CR-DEPLOY-01 remains OPEN.** Main and project-titan remain unchanged. PAY54 production and financial execution **NO-GO**.

## Installed CI baseline on both protected branches — 18 November 2026

The Founder subsequently authorised the controlled CI-only merges. Before merging, the exact three source files were compared between Draft PRs #17 and #18 and the approved Batch28 engineering branch. **All three Git blob SHA-1 IDs were identical across all three sources**, and each PR changed exactly the three new baseline files, with zero deletions or modifications of pre-existing application source. Base commit SHAs were unchanged and both PRs were green.

| Target | Approved CI-only PR | Merge method | Actual new branch SHA | Installed files |
| --- | --- | --- | --- | --- |
| `main` | [#17](https://github.com/demiladeolawoye/PAY54_v8.0_SmartWallet/pull/17) | squash | `52d43d68c50a6cf483a22cdf7ae9d71975a8095c` | All 3 reviewed file blobs confirmed identical |
| `project-titan` | [#18](https://github.com/demiladeolawoye/PAY54_v8.0_SmartWallet/pull/18) | squash | `aa2308a47562eacf6258a6037f66f9b0a3446904` | All 3 reviewed CI-only files; no app modifications |

The two merge actions did **not** merge the full 16-PR enterprise stack. No account, ledger, wallet, PSP or database code was touched.

### After-install validation using unrelated documentation-only pull requests

| Protected target | Disposable draft PR | Source SHA | GitHub Actions run | Result |
| --- | --- | --- | --- | --- |
| `main` | [#19](https://github.com/demiladeolawoye/PAY54_v8.0_SmartWallet/pull/19) | `f8243a8092b3d64d9d71405016fac1ad870b56fb` | [44274013180](https://github.com/demiladeolawoye/PAY54_v8.0_SmartWallet/actions/runs/44274013180) | **PAY54 Protected Branch Security — SUCCESS** |
| `project-titan` | [#20](https://github.com/demiladeolawoye/PAY54_v8.0_SmartWallet/pull/20) | `48f6339160cd1362b63c4331f96d86cb4670099a` | [44274021126](https://github.com/demiladeolawoye/PAY54_v8.0_SmartWallet/actions/runs/44274021126) | **PAY54 Protected Branch Security — SUCCESS** |

Both #19 and #20 were subsequently **CLOSED, UNMERGED**. The identical job context now runs for documentation-only changes **without including the workflow file in the PR**, proving that it is installed on both target branches rather than merely being introduced on a test branch.

### Unresolved enforcement and Pages exposure controls

GitHub ruleset **#27496881** remains **DISABLED** and no required-status-check context is configured. The GitHub connector used by this engineering office does not offer ruleset administration mutations. **Repository administrator must edit the saved ruleset in the GitHub UI, add exactly `PAY54 Protected Branch Security` under Require status checks to pass, and verify the GitHub Actions source.** Do not select the workflow's display name or legacy filtered job contexts instead of the **job** name. Independently confirm and obtain founder approval before changing the ruleset to Active, noting the temporary zero-reviewer setting is NOT production-grade.

**Critical independent Pages control:** The repo previously published Pages from `project-titan` `/(root)`; the Founder unpublished the site. GitHub documentation states a new commit to that configured branch can create a new Pages deployment after unpublication. **The authorised CI-only merge has now added one commit to `project-titan`. Therefore the current Pages live/offline state MUST be checked again by a repository administrator immediately.** The connector cannot access Pages settings or independently confirm the public deployment. If the Pages site has become live, unpublish again and change publishing Source away from root-branch deployment under separately authorised safe release procedures. The public repository/Git history remain accessible either way.

This risk is not a reason to falsely claim that actual private data was exposed; only confirmed root-source configuration and an unverified possible reactivation are established. Record the latest site status, deployment SHA and event before treating CR-PAGES-01 containment as closed.

**Production decision remains NO-GO.** The two branches are now updated with CI-only source, but the ruleset and external staging/finance acceptance remain incomplete.

## CR-PAGES-01 reactivation evidence — critical operational correction

On 18 November 2026, after the authorised squash merge into project-titan, the authenticated GitHub Actions API showed **pages build and deployment** run **44273764346**, commit **aa2308a47562eacf6258a6037f66f9b0a3446904**, **completed/success** (created at 09:12:34 UTC). This verifies that the former root-source Pages build/deployment workflow ran successfully again. Public HTTP response and deployed bytes were not independently inspected.

Administrator containment required immediately: open Settings → Pages, verify whether **Your site is live** is shown and unpublish again if so. Then change **Build and deployment → Source** from **Deploy from a branch** to **GitHub Actions**, save if required, and do not run a Pages deployment workflow. Independently confirm the resulting control and absence of live publication.

Freeze further project-titan pushes and merges until the dangerous automatic project-titan / (root) publication source has been disconnected. Unpublication alone does not protect public repository history or past secrets. Ruleset activation, hosted financial products and real customer services remain NO-GO.
