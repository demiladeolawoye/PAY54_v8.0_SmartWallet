# PAY54 Batch 44 — Disposable PostgreSQL Writer Denial & Rollback Probe

24 November 2026. **NO-GO, SOURCE/CI ONLY.** This extension uses the existing protected Batch22 PostgreSQL 16 service job. It changes no migration or policy and does not touch cloud resources.

## Checks added to the existing real PG16 pipeline
1. After candidate wallet-read migration, validate that all five financial relations are FORCE RLS protected and the restricted wallet-reader function exists.
2. Switch the database connection's actual effective PostgreSQL role to `pay54_ledger_executor_role` (NOLOGIN, NOINHERIT, NOBYPASSRLS). Prove that an attempted journal INSERT, ledger SELECT and reserve-function EXECUTE remain denied. Synthetic statements execute inside a ROLLBACK-only transaction.
3. Run the already present financial reservation, lifecycle and reversal regression after the forward candidate; importantly those previous tests use the migration owner/superuser, **not a genuine enabled application financial writer**.
4. Apply the paired rollback candidate. Verify the five relations return to recorded pre-forward RLS-disabled state, restricted wallet-reader function and policies are absent, financial read grants are not leaked, and executor access is still denied.
5. Re-run the existing ledger integrity test suites after rollback using synthetic data.

## Limits and blockers
This provides actual disposable database *negative* access and catalog proofs. It does **not** provide positive payment-writer acceptance evidence: the production writer role and credentials have not been enabled, and a superuser run is not a valid proxy. No broadened financial writer policy, role grant or new privileged function is added. Future review must establish correct minimum-privilege financial writer execution, trigger ownership, audited migration/rollback, actual partner settlement, TLS/IAM and staging credentials before any managed deployment.

**Do not merge or deploy a persistent migration based on these negative tests alone.** No cloud spending, customer-facing money movement or production release authorised. Staging **NO-GO**; production **NO-GO**.
