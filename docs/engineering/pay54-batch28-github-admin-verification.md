<!-- PAY54 Batch 28 / 1230 -->
# PAY54 Administrator Verification — Actual GitHub Pages and Release Controls

**Scope:** Manually verify live GitHub administration settings without changing them. This is the source of truth for CR-PAGES-01, CR-DEPLOY-01 and CR-MERGE-01 while the connected GitHub integration lacks administration permission.

## Observed 17 November 2026

- GitHub repository: `demiladeolawoye/PAY54_v8.0_SmartWallet`, visibility **PUBLIC**, default branch **main**, GitHub repo API flag `has_pages:true`.
- GitHub repository rulesets collection: empty list through permitted read-only API. This does **not** prove a branch lacks protection.
- Protected-branch reads for `main` and `project-titan`: API returned **403 Resource not accessible by integration**. Protection state **NOT VERIFIED**.
- GitHub Pages Settings/build/deployments endpoints: connected fetch integration rejected these endpoints. Current Pages source branch/build type, domains and deployment artifact **NOT VERIFIED**.
- Draft PRs #1 through #16 remain the intended review chain; do not merge or publish from this checklist.

## Founder / authorised GitHub repository administrator actions

These steps are **read-only**. The administrator can record the fields below in a private ticket. Avoid copying secrets, environment values, key material, user tokens, private repository archives, financial/customer information or detailed security evidence into public GitHub Issues/PR comments.

### A. Identify actual website publication

1. Sign into GitHub as a repository administrator and open **Settings → Pages** for `demiladeolawoye/PAY54_v8.0_SmartWallet`.
2. Record the **Build and deployment Source** (Deploy from a branch versus GitHub Actions).
3. If branch publishing is selected, record the exact **branch and directory** (`/` versus `/docs`). A repository-root public build is **unsafe** here because backend, governance and infrastructure source exist at root.
4. Record the **custom domain**, **Enforce HTTPS** indication, and displayed public URL. Do not change publishing settings until a verified static artifact and rollback are ready.
5. Open **Actions → Deployments** / **Environments** (where available) and identify the most recent actual `github-pages` deployment, source workflow, commit SHA and status.
6. Independently check whether sensitive repository paths or backups are accessible under the live site. Do not share sensitive response contents publicly. Escalate verified exposure as an incident with timestamps and preservation instructions.

### B. Verify branch protection and release administration

1. Open **Settings → Rules → Rulesets**. Record active rulesets, exact target branches, required PR reviewers/status checks and whether administrator bypass is permitted.
2. Open **Settings → Branches**. Check **both** `main` and `project-titan`: required PR, up-to-date checks, signed commits if mandated, force-push/deletion restrictions and administrator enforcement.
3. Record required protections for `cto/batch28-integration-release-hardening-1188-1307` and whether draft PR #16 is excluded from release by enforced rules.
4. Open **Settings → Environments**. Record the existence of `pay54-staging` and `pay54-production`, required independent reviewers and branch restrictions. Do **not** reveal environment secrets or values.
5. Establish an independent Security/Release reviewer; the same author should not self-approve the entire 16-PR stack.
6. Record whether the intended future deployer has an isolated machine/workload identity with OIDC bound to a restricted repository ID, branch, environment and exact workflow. Do not create tokens in chat.

### C. Review the isolated Batch28 marketing preview

1. Open [Draft PR #16](https://github.com/demiladeolawoye/PAY54_v8.0_SmartWallet/pull/16) → **Checks**.
2. Open **PAY54 Batch 28 Integration and Safe Preview** for the **current PR head SHA**.
3. In the workflow run's **Artifacts**, use the artifact named `pay54-marketing-preview-<SHA>`. Its retained package should contain **only** `index.html` and `assets/css/preview.css`. The artifact expires after **7 days**.
4. Inspect the extracted two-file package offline. It contains no login, real wallet, card funding or executable application JavaScript; it is not a candidate to move real funds.
5. Do not enable or alter GitHub Pages as part of viewing this offline artifact. Separate Founder/Security/Release permission is required for any publication.

### D. Required private evidence record

| Evidence field | State until operator verifies |
| --- | --- |
| Pages source and directory | NOT VERIFIED |
| Pages live deployment SHA and provenance | NOT VERIFIED |
| Public content and historical sensitive exposure | NOT VERIFIED |
| `main` branch protection / administrator bypass | NOT VERIFIED (403) |
| `project-titan` branch protection / administrator bypass | NOT VERIFIED (403) |
| Effective repository rulesets | ZERO VISIBLE via connected read API, independently unverified |
| `pay54-staging` / `pay54-production` protection | NOT VERIFIED |
| Isolated authorised OIDC deployer | NOT VERIFIED |
| Staging PostgreSQL / IdP / real payment partners | NOT PROVISIONED OR CONFIRMED |
| Real production permission | **DENIED — PAY54 NO-GO** |

## Escalation and boundary

If the active website actually serves repository backend, SQL, private documentation, credentials or customer data, stop any scheduled publication changes, preserve evidence in a restricted incident channel, rotate compromised secrets through authorised systems and perform legal/privacy incident triage. A repository source path by itself does not prove an internet exposure: obtain the actual HTTP response and provenance.

Do not send GitHub personal-access tokens or cloud secrets to ChatGPT. Administrator screenshots can be redacted to show **settings state** only; screenshots are not a substitute for a signed security assessment.

**CTO disposition:** Await real settings and deployment evidence. No merge or publication permission is granted by this runbook.
