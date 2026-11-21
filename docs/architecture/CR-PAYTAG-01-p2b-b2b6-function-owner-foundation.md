# PAY54 CR-PAYTAG-01 — P2B-B2B6 Isolated Function-Owner Foundation

## Release decision
**Source-only and inert.** Existing P2B-B2B5 preflight merged as PR #57, protected commit `9f0045dc031613d9aa4a23879b0e4cbb45b0a122`. Migration 027 creates an isolated prospective function-owner identity, `pay54_paytag_function_owner_role`, independent of the inert callable `pay54_paytag_register_role`. It grants no permissions and transfers no ownership.

## Threat model and privilege split
A function intended to validate sessions and claim a canonical alias must never allow its caller to acquire direct DML on auth sessions, account contexts, wallet bindings, the PayTag registry, its audit or idempotency journal. The reserved function-owner identity is NOLOGIN, NOINHERIT and NOBYPASSRLS; neither it nor the callable identity has members. No financial ledger permissions or any PayTag execution rights are granted.

The existing `register_paytag_trusted` remains SECURITY INVOKER, owned by its original migration owner, and not callable by the runtime role. Moving it to SECURITY DEFINER or granting a callable wrapper is explicitly **not authorised** in this phase. In particular, RLS FORCE must remain effective on all identity, registry, and audit tables, and trigger functions must be accounted for under the correct PostgreSQL invoker semantics.

## Necessary tests before any execution-enabled phase
1. A reviewed, **table/column/command-specific privilege matrix**, including trigger paths and unique constraints, with PostgreSQL evidence under the proposed owner.
2. Effective FORCE RLS policy evaluation for sessions, accounts, owner memberships, wallets and bindings, registry and audit rows, and idempotency journal. Tests for direct SELECT/UPDATE/INSERT/DELETE denial by caller and cross-account row rejection.
3. PostgreSQL two-connection race tests: same alias/different accounts; same account/different aliases; exact replay; token/CSRF tampering, session revocation/rotation; account suspension; membership/wallet changes; expiration and multi-wallet ambiguity.
4. Clear choice of function ownership and secure search_path. Audit role inheritance, default ACLs, PUBLIC grants, malicious search_path and temp-schema shadowing.
5. Evidence of SERIALIZABLE retry safety and after-commit uncertainty reconciliation without acknowledging uncommitted or unknown results.

## CI acceptance
Apply migration 027 to disposable PostgreSQL after 026; run `020_paytag_function_owner_isolation.sql` and the existing 001–019 regression suite. The role-isolation proof checks no ownership transfer, no memberships or execution privilege, no table grants, no new role-specific RLS policy and actual denied execution after SET ROLE.

## Out of scope
No database LOGIN, connection credential, production migration, actual SECURITY DEFINER writer, permission activation, endpoint, customer registration, financial ledger/FX/card operation or public Pages publication. The next separately reviewed work package will address restricted invocation mechanics and complete role-level PostgreSQL tests. **Production NO-GO.**
