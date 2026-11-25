# PAY54 Batch 46 — Least-Privilege Financial Writer Compatibility Contract

**Source/disposable only — 24 November 2026.** The existing PostgreSQL 16 financial procedures in canonical migrations 003 and 004 use `SECURITY INVOKER`. Thus they execute with the **actual caller's** table and RLS permissions. Batch38's wallet-read proposal enables `FORCE ROW LEVEL SECURITY` on the five financial ledger/wallet relations and installs reader-specific SELECT policies, without activating an authorised financial writer.

## Delivered
- A SQL catalogue/permission audit executed against the already available disposable PG16 test service, between forward and rollback. It requires invoker security, verifies restricted executor has no financial EXECUTE, and checks forced financial RLS remains active with no broad writer policy for executor/PUBLIC.
- Source-only compatibility contract checking the existing three financial procedure declarations and five forced-RLS transitions with negative unit tests.
- No migration, grant, new role, actual enabled payment writer, secrets, cloud account, API or operational connection.

## Required next implementation, separately reviewed
1. Define an authenticated session-bound internal financial command contract, tying account, device/session, idempotency key and transaction authorization to trusted server-side identity. Never trust a caller-supplied owner UUID by itself.
2. Design non-superuser, non-BYPASSRLS, least-privilege writer execution with explicit reviewed RLS policies for legitimate write paths and row locks. The `FOR UPDATE` operations require compatible SELECT and UPDATE rights; do not automatically grant broad DML to the customer-facing role.
3. Validate real PostgreSQL transaction execution on disposable data under exact effective writer role: funded reserve, idempotent replay, capture, release, reversal, double-spend/tenant denial, journal balancing and atomic outbox.
4. Verify RLS reader segregation and no access escalation. Restore exact pre-forward baseline after rollback, and rerun the positive and negative regressions.
5. Obtain independent DBA and Security signoff. Never assume the owner/superuser-run current tests prove writer compatibility.

## Admission
This batch makes the incompatibility boundaries visible and testable. It does **not** establish positive writer execution. Staging NO-GO, production NO-GO, cloud spending NOT AUTHORISED. The protected branch remains the sole integration source until independently reviewed and reconciled.
