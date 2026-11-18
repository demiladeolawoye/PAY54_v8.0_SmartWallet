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
