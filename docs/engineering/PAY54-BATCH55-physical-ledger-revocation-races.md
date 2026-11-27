# PAY54 Batch 55 — Physical Financial Posting vs Session Revocation

25 November 2026 · **Actual two-connection disposable PostgreSQL 16 concurrency**, synthetic financial schema only.

## Preconditions and scope

This PR stacks on reviewed-but-unmerged PR #94. The PostgreSQL runner refuses non-PR CI, missing Docker PostgreSQL container, non-disposable environment and anything other than `PAY54_FINANCIAL_EXECUTION=false`. It creates dedicated synthetic schema `pay54_b55` and a genuine `NOLOGIN NOSUPERUSER NOBYPASSRLS` writer with scoped, FORCE-RLS policies. Synthetic fixtures are committed *only inside a disposable CI database* so separate physical connections can test concurrency. Its cleanup trap revokes the temporary `pay54` schema name-resolution grant, drops the synthetic schema and role, and checks both are absent. It never grants canonical wallet/ledger table access or executes PAY54 customer-money functions.

## Actual physical races

**Case A — posting locks first:** a restricted writer transaction calls a `SECURITY INVOKER` synthetic ledger procedure. It locks the session row with `SELECT FOR UPDATE`, generates one balanced two-entry journal plus one outbox event, and holds its transaction open. A separate revoker connection attempts to update the same session and is observed in PostgreSQL `pg_stat_activity` waiting on a real lock. Only after the writer COMMIT may revocation finish.

**Case B — revocation locks first:** a revoker transaction updates the second synthetic session and holds its lock. The restricted writer's new financial command waits on that row; after revocation commits, READ COMMITTED predicate re-evaluation rejects the command with `P5451`. Neither a journal nor outbox is allowed for that rejected attempt.

An independent connection checks the final committed state: exactly one transferred synthetic journal, two balanced entries, one outbox, source 7,500 and destination 2,500 minor units, both sessions revoked, and zero entries for the rejected command. Missing lock contention, nonzero exit codes, incorrect balances or incomplete cleanup fail the job.

## Important limitations

- This **does not** run the canonical PAY54 `reserve_wallet_transfer`, `capture_reserved_wallet_transfer` or `release_reserved_wallet_transfer` under a production-permitted writer, nor prove canonical FORCE RLS writer compatibility.
- Authentication is intentionally fixed to synthetic identities. The disposable harness uses a privileged fixture installer and a restricted effective writer role; it does not authenticate live users or operate in managed staging.
- Existing Batch54 single-transaction rollback proof and Batch49 session-only concurrency proof remain separate regression sources.
- Holding a session lock through an atomic synthetic ledger posting does not establish provider settlement, AML/fraud controls or real spendable funds.
- No PR merge, cloud spending, live credentials, staging or production deployment is authorised by this test.

## Next technical admission

Approve separately designed session-bound canonical writer policies and principal attestation, using audited financial function ownership and minimum rights. Run full canonical reserve/capture/release, concurrent session revocation, idempotency, double-spend denial and rollback using real non-superuser effective SQL identities, with Security/DBA review and partner settlement evidence.

**Source merge NO-GO pending review. Staging NO-GO. Production NO-GO. Cloud spending NOT AUTHORISED.**
