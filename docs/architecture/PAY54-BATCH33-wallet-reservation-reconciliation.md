# PAY54 Batch 33 — Reservation-aware wallet reconciliation and isolated database authority

## Protected baseline
PR #72 merged into `project-titan` at `80f96ed2adc765a33f10344a730b4e170b4f0a98`. Existing canonical account reader remains without direct ledger SELECT rights.

## Implemented source package
- `backend/domain/wallet-reservation-reconciliation.mjs` is a pure BigInt minor-unit calculator. It validates a strict record with wallet/account UUIDs, 3-letter currency, finite unsigned decimal integer strings, reliable counts, one read-only RLS-bound snapshot, and a positive revision. It computes posted minus all HELD reservations without floating point and rejects apparent over-reservation or contradictory counts.
- `backend/db/queries/wallet-reservation-snapshot-disposable.sql` is a parameterised PostgreSQL query joining trusted active session, legal owner, active membership and personal wallet binding. Separate LATERAL aggregates prevent multiplication of ledger entries by reservations and filter POSTED journals and all HELD holds. Expired-by-clock but still HELD reservations are deliberately included, consistent with canonical reservation migration 003.
- `backend/db/tests/batch22/029_wallet_reservation_snapshot_disposable.sql` checks real PostgreSQL schema and one-statement zero case, mismatched account, token, suspended membership and session revocation, plus existing reader privilege denial and fixture rollback.
- Existing protected PostgreSQL integration and Node dashboard security workflow run the new tests, preserving the original migration/financial permission contract.

## Important limitations
- The example database query is **disposable-only**, executed under the test harness's privileged PostgreSQL identity. It grants no permanent role permission and **does not verify restricted runtime DB access**, production session identity, TLS, secret custody or real RLS-bound execution.
- Current disposable SQL tests prove zero posted/zero held and denial paths. Positive funded-wallet reservations, captures, partial releases, reversals, concurrent holds and provider settlement remain **outstanding integration evidence**. The pure arithmetic tests cover positive holds but are not database transaction proofs.
- `computedUnreservedMinor` is an accounting-derived estimate, **not an independently approved spendable balance**. Settlement, provider status, reversal policy, chargeback exposure, negative accounting and availability rules are still to be approved. No `availableMinor` response field or live dashboard binding is introduced.
- No new `SECURITY DEFINER`, `LOGIN`, `GRANT`, RLS policy, API route, production migration or financial operation is created. Do not execute the example test query with live customer credentials.

## Required next gate
Design a dedicated restricted, revocable database execution role whose function ownership, forced RLS and session binding can be independently tested; prove a full funded reservation lifecycle and exact ledger/hold reconciliation with concurrency before customer display. Then separately verify the HTTP-to-database adapter, mobile/accessibility acceptance, provider custody and deployment/rollback under approved infrastructure.

**Decision: source-only acceptance pending independent reviewer and exact-head checks. Persistent staging and production NO-GO.**
