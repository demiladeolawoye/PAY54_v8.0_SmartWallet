# PAY54 Batch 45 — PostgreSQL Financial Writer Identity & Positive Evidence Admission

**24 November 2026 — DISPOSABLE/NO DEPLOY.**

## Implementation
1. A read-only SQL catalogue audit executes inside the existing disposable PostgreSQL 16 suite between the Batch38 candidate forward migration and rollback. It checks that the three canonical financial procedures exist, their owners are isolated from the dormant ledger executor and wallet-read roles, that no PUBLIC or inappropriate EXECUTE grants are present, and that the executor has no direct financial table access.
2. An independent offline ES module validates a future *human-supplied evidence register* for positive writer correctness, including reserve/capture/release/reversal, idempotency, tenant denial, outbox atomicity, rollback and DBA/Security signoffs. It always returns **human review needed**, never deploy/spend approval.
3. Node negative regression tests and an unprivileged source-only CI workflow exercise the register.

## Important scope boundary
The existing `pay54_ledger_executor_role` is deliberately NOLOGIN and denied financial procedure execution. Therefore an actual authorised end-to-end positive financial writer transaction **cannot currently be claimed** from this repository path. The existing superuser-operated disposable financial tests verify database invariants, not a production-authenticated writer. Batch45 preserves that negative security boundary and exposes the precise positive evidence still missing.

Before promoting the Batch38 FORCE RLS migration, engineering must build a separately reviewed least-privilege function-only writer contract (no broad financial DML), run real transactions under the actual non-superuser effective identity, and rehearse forward/rollback preserving ledger and outbox invariants. Review partner settlement separately; no accounting figure can be represented as customer spendable funds without an approved source.

**Not permitted:** any new credential, privilege grant, live PostgreSQL connection, cloud provision, persistent migration, payment, API activation or staging deployment. `project-titan` source acceptance and staging release are separate gates.

**Staging NO-GO. Production NO-GO.**
