# PAY54 CR-PAYTAG-01 — P2B-B2B5 Execution Authority Preflight

**Decision: do not grant execution yet. This phase provides a tested authorization boundary, not an operational registration service.**

## Confirmed baseline
PR #56 merged into protected `project-titan` at `271ca45a158bc331e6d5595a61b2db1f4e983a0d`. Migration 026 establishes a non-login, non-inheriting, non-bypass PayTag role with no grants. Migration 025 exposes a SECURITY INVOKER SQL function but denies app, ledger and PUBLIC execution. Account, wallet, audit and registry tables have enforced RLS.

## Architecture decision
Granting `EXECUTE` on the SECURITY INVOKER writer to a restricted role would not make it a safe trusted executor. The function queries and mutates protected session, account, wallet, registry, audit and idempotency tables. Opening broad direct DML to that caller would expose confidentiality and integrity outside the function. We must not solve missing privileges with table-wide grants, a superuser, BYPASSRLS, a shared ledger role, session GUCs as the sole identity source, or insecure SECURITY DEFINER ownership.

## Required design for later activation
1. Separately approve an *isolated NOLOGIN, NOBYPASSRLS function owner*, with ownership and a narrowly auditable privilege matrix. Never use the financial ledger owner, superuser or application role as function owner. Confirm PostgreSQL trigger-function and RLS semantics under that exact owner.
2. Preserve an immutable, pinned function search_path and schema qualification; disallow ownership via an untrusted role membership. A restricted callable interface must use explicit authenticated session token and CSRF digests in a SERIALIZABLE transaction, not client-controlled identity GUCs.
3. Minimize owner-level table grants to precise operations required by the writer and trigger chain. Define independently reviewed, row-scoped, FORCE RLS policies for the owner; account, wallet and session constraints must remain checked under locks. Confirm RLS visibility and WITH CHECK behavior for inserted rows and audit triggers.
4. Test under actual separate database connections with role switching disabled for untrusted clients. Cover distinct customer accounts, two-account same-alias conflicts, concurrent same-account requests, idempotent exact replay and tampering, revoked/rotated sessions, expired sessions, suspended accounts, inactive memberships, wallet-binding ambiguity and mutation races.
5. Exercise unexpected SQLSTATE errors and connection loss after commit; never report a payment or claim as successful until a verified committed result is known. No network endpoint or live provider integration before staging-only verification.
6. Inspect function owners, full role membership graph, ACLs, default privileges, PUBLIC schema/function exposure, RLS policies and migration privileges. A role name by itself is not least privilege.

## This PR's executable evidence
`backend/db/tests/batch22/019_paytag_execution_boundary_preflight.sql` runs in disposable PostgreSQL and asserts the role remains inert across all schema tables, required tables maintain FORCE RLS, no unexpected PayTag RLS policies exist, and the SQL writer is not granted to the PayTag, app, PUBLIC or ledger roles. Existing regression tests still run.

## Release boundary
No migration 027, no role ownership transfer, no grants, policies, production DDL, runtime credential, customer API, Pages publication, card/ledger/FX operation or real-money execution. Follow-on phases must establish executable restricted role and full race testing in separate PRs with independent database/security approval. Production remains NO-GO.
