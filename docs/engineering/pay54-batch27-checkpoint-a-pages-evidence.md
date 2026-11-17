<!-- PAY54 Batch 27 / 1107 -->
# PAY54 Batch 27 — Checkpoint A: Actual Pages Evidence and Release Preconditions (1107)

**Batch authority:** Founder-approved 120-action engineering batch (1068–1187), with verification at 40, 80 and 120. **Checkpoint A scope:** actions 1068–1107, inclusive. These are source engineering actions (modules, negative-path tests, CI and an operator procedure), not forty new banking features.

## What the first forty actions provide

- Strict REST-shaped Pages settings and deployment metadata normalisation, SHA binding, evidence freshness and an incident-observation inventory; a reported GitHub status does not independently prove the deployed bytes.
- Fixed, **read-only** GitHub REST collector with response-size limits, redirects disabled, no private response export, and explicit 403 → `NOT_VERIFIED` handling.
- CLI for an authorised repository operator to collect only Pages, branch-protection, environment or ruleset metadata.
- Source-only OIDC claim review, branch-protection metadata, four-role PostgreSQL role-grant drift, regulated UK–Nigeria rail and card provider signoff prerequisites.
- Identity/account activation, 20-migration change, rollback, staging acceptance and security evidence transitions with deny-by-default negative tests.
- A dedicated pinned, read-only Batch 27 workflow that runs these tests alongside retained Batch 26 and Batch 25 security/financial denial suites.

### Administrator-run Pages evidence collection

From a trusted development workstation with Node.js 24 and the PAY54 repository checked out at the reviewed SHA, the authorised repository administrator may run these commands. **Do not paste a token into chat, the repo, a PR, shell history or any website.** Use a fine-grained short-lived token issued by GitHub with only the relevant metadata/Pages read permissions. Set `GITHUB_TOKEN` using a secure local secrets mechanism.

```bash
node backend/governance/pay54-batch27-github-review-cli.mjs pages
node backend/governance/pay54-batch27-github-review-cli.mjs defaultBranchProtection
node backend/governance/pay54-batch27-github-review-cli.mjs environments
node backend/governance/pay54-batch27-github-review-cli.mjs rulesets
```

Record the redacted JSON, exact checked-out source SHA, UTC collection date, GitHub account/reviewer identity and read-only change ticket in a restricted evidence store. Security independently checks the GitHub settings in the account UI, validates current public artifact hashes, and decides if a formal exposure incident is necessary.

**Important:** A 401/403/404 or unavailable Pages URL leaves the state `NOT_VERIFIED`; a report of `status: built` cannot prove the public artifact is safe. The CLI neither changes repository settings nor publishes any content. It cannot validate the physical environment or provider contract by itself.

### Remaining operational blockers

P0 CR-PAGES-01, CR-CARD-01, CR-DEPLOY-01, CR-IDENTITY-01, CR-DB-01, CR-RATE-01, CR-ACCOUNT-02, CR-FINTECH-01 remain OPEN. Real device/accessibility QA and SRE/observability evidence also remain pending. No customer login, funding/FX/settlement, live PostgreSQL provisioning, Pages publishing or GitHub IAM mutation is authorised.

**Checkpoint rule:** Do not mark the first forty actions verified until the dedicated Batch27 and inherited security workflows finish successfully on the exact checkpoint SHA. Source acceptance is not operational clearance.
