# PAY54 Batch 51 — Consolidated PostgreSQL 16 Integration Gate

24 November 2026. **NO deployment or source merge permitted.** Integration target: `project-titan`, pinned base `917404fdb83b4f208cd709c0c7fede832f4f0205`.

## Problem established by Batch 50
Reviewed draft PRs #81–#89 individually passed their checks but cannot merge cleanly as a set: the existing `.github/workflows/pay54-batch22-postgres-rls-integration.yml` is independently changed by PRs #84, #85, #86 and #89. Batch 50 discovered its first real local Git conflict when merging #85 after #81–#84. A green Batch50 diagnostic CI is not proof of merge compatibility.

## Batch51 approach
An independently reviewed CI shell script verifies all nine **exact** branch heads and the unmodified protected base before touching anything. In a detached runner checkout, it locally merges PRs #81–#89 in order. Only the known shared workflow conflict is eligible for reconciliation; unexpected conflicts fail closed.

The reconciliation workflow is built from the *exact reviewed PR #89* workflow with all prior missing financial tests retained: pre-rollback `035` (executor denial), `037` (financial function ownership) and `038` (invoker contract), then `036` (post-rollback denial) and the original reservation/lifecycle/reversal suites after rollback. `039` remains in its original early revocation-race step. The existing Batch22 migrations, account/RLS/PayTag tests, preflight, reader checks, financial SQL and rollback tests remain in the combined workflow.

The CI job performs the physical **PostgreSQL 16 integration suite on the combined local source** using its disposable Docker service. It runs no Cloud SQL or real-money transactions and pushes nothing to GitHub. All local merge commits vanish with the runner.

## Admission semantics
A green result is a required *engineering evidence input*, not source-merge approval. Recheck all SHA pins on branch change, GitHub review, DBA/Security privilege posture, exact negative and positive writer regression and local infrastructure controls. Do not interpret superuser-operated financial tests as proof of an authorised non-superuser financial writer. Require an independently reviewed persistent integrated branch and branch-protection approval before any future source merge.

No paid cloud access, real-money service, customer-facing balance activation or staging/production deployment is authorised. **Staging NO-GO, production NO-GO and spending NOT APPROVED.**
