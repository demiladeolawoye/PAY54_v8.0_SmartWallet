<!-- PAY54 Batch 28 / 1230 -->
# PAY54 Administrator Verification — Actual GitHub Pages and Release Controls

**Scope:** Screenshot-supported live GitHub Pages observation plus immediate publication-risk containment, followed by independent administrator verification. Connected GitHub integration has no Pages administration mutation or protected-branch read permission.

## Confirmed Pages Settings evidence — Founder screenshot, 17 November 2026

The Founder supplied a screenshot of the repository's own GitHub **Settings → Pages** page. It shows the Pages site **LIVE** at `https://demiladeolawoye.github.io/PAY54_v8.0_SmartWallet/`, source **Deploy from a branch**, branch **project-titan**, publishing directory **/(root)**, blank custom domain, and **Enforce HTTPS** checked/required. GitHub displayed **Last deployed yesterday** (interpreted relative to screenshot date as **16 November 2026**), with the `github-pages` environment and Pages build/deployment workflow.

**Confirmed security finding:** Active root-source publication of `project-titan` is an unsafe hosting configuration. Backend, governance, database and infrastructure source live in the project root. A screenshot of the settings establishes the source configuration, **not** actual public availability of any particular backend file, secret or customer record. Attempts to independently fetch the public site through the available browsing/runtime environment were inconclusive because the address could not be accessed.

**Immediate incident-containment recommendation:** An authorised repository administrator should click **Unpublish site** in Settings → Pages, confirm the warning and preserve evidence that the site is unpublished. This intentionally suspends the existing Pages website until a reviewed isolated deployment is ready. The current GitHub connector cannot perform this action and no unpublish has been executed automatically. Preserve the screenshots, deployment SHA/history and relevant private evidence. Review actual public-source availability and secret exposure separately; never declare no breach from a 404 alone.

**Control:** Do not resume Pages publication from `project-titan` root. Do not switch to `main` root or to `/docs` without reviewing a complete independently verified static-only build; GitHub Pages source settings cannot target the independent `public-preview` subdirectory directly as a generic branch folder. A future GitHub Actions static-artifact publishing workflow requires separate Source/Release/Security approval.

## Observed 17 November 2026

- GitHub repository: `demiladeolawoye/PAY54_v8.0_SmartWallet`, visibility **PUBLIC**, default branch **main**, GitHub repo API flag `has_pages:true`.
- GitHub repository rulesets collection: empty list through permitted read-only API. This does **not** prove a branch lacks protection.
- Protected-branch reads for `main` and `project-titan`: API returned **403 Resource not accessible by integration**. Protection state **NOT VERIFIED**.
- GitHub Pages Settings/build/deployments endpoints: connected fetch integration rejected these endpoints. Current Pages source branch/build type, domains and deployment artifact **NOT VERIFIED**.
- Draft PRs #1 through #16 remain the intended review chain; do not merge or publish from this checklist.

## Founder / authorised GitHub repository administrator actions

These steps are **read-only**. The administrator can record the fields below in a private ticket. Avoid copying secrets, environment values, key material, user tokens, private repository archives, financial/customer information or detailed security evidence into public GitHub Issues/PR comments.

### A. Contain unsafe Pages publication and validate actual website state

1. Sign into GitHub as a repository administrator, preserve the confirmed Settings → Pages screenshot, and open **Settings → Pages** for `demiladeolawoye/PAY54_v8.0_SmartWallet`.
2. Record the **Build and deployment Source** (Deploy from a branch versus GitHub Actions).
3. If branch publishing is selected, record the exact **branch and directory** (`/` versus `/docs`). A repository-root public build is **unsafe** here because backend, governance and infrastructure source exist at root.
4. Record the **custom domain**, **Enforce HTTPS** indication, and displayed public URL. **Unpublish** the currently live unsafe root-source Pages site as the authorised containment action; do not replace it with another repository-root source.
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
| Pages source and directory | **CONFIRMED LIVE**: branch project-titan, /(root), from Founder screenshot |
| Pages latest deployment time and SHA | Screenshot reports last deployed 16 Nov 2026; exact SHA NOT VERIFIED |
| Public content and historical sensitive exposure | NOT VERIFIED; incident-risk assessment OPEN |
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

**CTO disposition:** Unsafe live Pages source settings **CONFIRMED**. Immediate authorised unpublication is recommended; execution has not been verified. Exact published artifact, exposure, historical content and protected deployer remain unverified. No merge or new publication permission is granted.
