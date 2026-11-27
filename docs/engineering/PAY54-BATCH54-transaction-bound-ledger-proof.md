# PAY54 Batch 54 — Transaction-Bound Synthetic Ledger Execution Proof

25 November 2026. Source target: stacked PR on the reviewed but **unmerged** Batch53 branch. This is a **real restricted PostgreSQL 16 transaction test** using an isolated, synthetic ledger schema. It is not an implementation or activation of PAY54's canonical customer-money execution.

## Implementation
The disposable PG16 suite creates a unique rollback-only `pay54_b54` schema containing synthetic sessions, accounts, journals, double-entry ledger entries and an outbox. It creates a non-login, non-superuser, NOBYPASSRLS `pay54_b54_writer` with narrow table grants and FORCE RLS policies fixed to one synthetic principal. No production credentials or canonical financial grants are issued.

A `SECURITY INVOKER` procedure holds a session-row lock until a transaction completes. It validates an active session, locks source/destination accounts in a deterministic order, checks the source's posted signed balance, and atomically inserts one journal, two balanced entries and one outbox event. It provides a scoped idempotency replay and rejects a conflicting digest. The test changes the effective PostgreSQL role and checks a successful synthetic 2,500-minor-unit transfer, 10,000→7,500 source balance, 0→2,500 destination balance, zero-net journal, single outbox, replay reuse, cross-owner access refusal, and overspend refusal. The test then revokes the synthetic session using the same row update lock and verifies new commands are denied. Its final ROLLBACK removes the role, schema, fixtures and all synthetic postings.

## Explicit limitations
- The transfer procedure, hard-coded synthetic RLS policy and fixed principal **must not be transplanted into the PAY54 financial schema**. Test identity is deliberately hard-coded; real customer authentication is neither implemented nor attested here.
- Real two-physical-connection *financial posting vs revocation* concurrency was not tested in this batch. The existing Batch49 test proves session locking in isolation, not a production money-command linearization guarantee.
- This test does **not** execute PAY54's canonical `reserve_wallet_transfer`, `capture_reserved_wallet_transfer` or `release_reserved_wallet_transfer` as a non-superuser. Canonical writer permissions and FORCE RLS compatibility remain unproven.
- A balanced synthetic journal/outbox does not establish real settled funds, production available balances, provider correctness, customer balances, fraud controls or settlement finality.
- Batches 52 and 53 remain draft source candidates. Do not merge solely because these tests pass.

## Remaining production admission gates
Implement independently reviewed least-privilege policies and trusted transactional financial command identity, real locked writer/revoker concurrency on the canonical ledger, exact-effect idempotency, tested rollback, DBA and Security authorisation, provider settlement validation, Cloud SQL GBP quote and explicit spending approval.

**Cloud spending NOT AUTHORISED. Managed staging NO-GO. Production NO-GO.**
