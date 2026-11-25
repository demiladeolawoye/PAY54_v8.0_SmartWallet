# PAY54 Batch 53 — Real Restricted-Role PostgreSQL Canary (No Financial Execution)

25 November 2026 · Review target: protected `project-titan` via the **stacked** Batch52 integration candidate. This implementation intentionally does **not** activate or privilege the canonical financial executor.

## Reviewed financial architecture
PAY54's canonical `reserve_wallet_transfer`, `capture_reserved_wallet_transfer` and `release_reserved_wallet_transfer` are `SECURITY INVOKER` procedures, and the proposed wallet-read migration enables `FORCE ROW LEVEL SECURITY` across five financial relations. The existing financial executor is a NOLOGIN role without active money-function privileges. Approving an unrestricted writer or granting blanket ledger DML would undermine existing controls.

## Delivered real PostgreSQL proof
The new SQL test runs against the existing GitHub Actions disposable PostgreSQL 16 service after the combined rollback tests. It creates a unique **synthetic canary schema and NOLOGIN/NOSUPERUSER/NOBYPASSRLS role inside a database transaction**. It then switches to that genuine restricted effective role and verifies:
- a scoped `UPDATE` succeeds for the canary's authorised synthetic owner;
- another synthetic owner's row is not visible or updatable;
- an ungranted `INSERT` fails, and the canonical ledger, reservation and money procedures remain inaccessible;
- the superuser observer checks that only the allowed row changed;
- the surrounding transaction is rolled back and the test verifies neither canary schema nor role persists.

The policy binds to a **fixed, synthetic test owner** and is *not* a deployable or caller-provided identity scheme. These are genuine PostgreSQL role/privilege/RLS checks, not a mocked evidence JSON. They do **not** establish positive money operations, production authentication, session-lock linearizability with an actual ledger write, service IAM, partner settlement or safe customer available balances.

## Required next milestone
Design a separately reviewed transactionally bound financial command that derives trusted identity inside the database transaction, uses an approved non-superuser writer role, holds the revocation session lock through the ledger/outbox commit, grants only independently audited table/policy access, handles idempotency/retry and preserves all ledger and rollback invariants. Run positive reserve/capture/release plus denial and concurrent revocation with synthetic accounts under the *actual* effective writer identity. Do not adapt this canary into a production grant.

Batch52 remains unmerged until separately authorised. This stacked PR does not approve source merges, spend or deployment.

**Source merge: separate approval required. Cloud spending: NOT AUTHORISED. Staging: NO-GO. Production: NO-GO.**
