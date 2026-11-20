<!-- PAY54 Batch 27 / 1147 -->
# PAY54 Batch 27 — Checkpoint B Engineering Verification (1068–1147)

**Authority:** Founder-approved maximum of 120 numbered engineering actions before the next approval. **Checkpoints:** actions 1068–1107, 1108–1147, and 1148–1187. This is the 80-action intermediate source review, not a declaration that 120 actions or production launch are complete.

## Source implementation delivered through Checkpoint B

The first forty actions built safe, read-only GitHub Pages settings and deployment metadata collectors, bounded JSON parsing, redacted reports, observable branch-protection and OIDC evidence, and a protected draft PR workflow.

The second forty actions add an operator-invokable bounded public **static asset hash** probe that cannot request backend/SQL/private source; independent comparison of observed static hashes to candidate manifests; actual PostgreSQL catalogue readers for four roles, forced RLS on canonical account/session tables, restricted SECURITY DEFINER owners and session issuance boundaries; source-only development-card publishing gates; account API activation conditions; and initial UK–Nigeria provider contract, expiry and signoff checks.

New source audit utilities capture historical Git filenames (never source bytes), group public-audit paths into redacted categories, check incident evidence retention, detect possible Pages source-setting downgrades, inspect CSP/HSTS metadata and compare protected rollback identities. The unique action-ledger reconciler fails if any numbered source action is absent or duplicated, preventing inflated implementation counts.

## Verification procedure

- GitHub PR #15 must remain **DRAFT**, stacked on verified Batch 26.
- Validate the actual Git-tracked action ledger through ID 1147; expected 80 unique actions.
- Run `node --test backend/tests/account-batch27-*.test.mjs` plus retained Batch 25/26 tests.
- Wait for all exact-head GitHub workflows to pass; cancelled runs on intermediate commits are not evidence.
- Review role catalogue probes and public static GET hash collection as **operator-facing capabilities only**. No real staging database or public Pages service was accessed by source-only CI.
- Do not merge, change live GitHub Pages settings, create cloud IAM identities, connect payment rails, issue customer credentials or enable account HTTP routes based on source CI.

## Current release blockers

| Priority | Requirement | State |
| --- | --- | --- |
| P0 | Verify active Pages publishing source, deployed artifact and historic exposures with repository administrator | OPEN |
| P0 | Replace/quarantine browser development-linked-card provider before live customer funding | OPEN |
| P0 | Protected deployer, OIDC/environment/branch approvals and restored known-good Pages rollback | UNVERIFIED |
| P0 | Actual contracted identity provider, MFA, anti-replay rate limit, session/account API | NOT PROVISIONED |
| P0 | Actual PostgreSQL staging, four restricted logins, migrations 001–020, RLS/PITR | NOT DEPLOYED |
| P0 | UK inbound, global FX backbone and two licensed Nigeria payout partners, AML/KYC/safeguarding | NOT APPROVED |
| P1 | iOS/Android/desktop, accessibility, ten-domain account cache isolation, SRE/incident QA | PENDING |

**CTO recommendation:** Complete meaningful source hardening to action 1187 only where it materially supports a launch blocker. If further source work would merely restate approvals without progressing real evidence, stop and flag that constraint instead of fabricating implementations. Production stays **NO-GO**.
