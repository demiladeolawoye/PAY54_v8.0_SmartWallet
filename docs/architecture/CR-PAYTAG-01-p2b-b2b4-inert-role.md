# PAY54 CR-PAYTAG-01 — P2B-B2B4 Inert Execution Role

**Source-only, isolated role foundation. Production and customer-facing registration remain NO-GO.**

Migration 026 creates the dedicated `pay54_paytag_register_role` as NOLOGIN, NOINHERIT, NOSUPERUSER and NOBYPASSRLS, without membership, schema usage, table/sequence access, function EXECUTE, ownership, RLS policies or a credential. The role therefore cannot call the migration 025 registration writer. It does not provision a backend connection or enable financial execution.

## Why the role is intentionally inert

The migration 025 writer is SECURITY INVOKER and accesses FORCE RLS tables. Simply granting it EXECUTE would either fail under RLS or tempt unsafe direct table grants. An independently reviewed, minimal execution-authority design must prove restricted RLS, actor/session verification, trigger behavior and transaction atomicity under an actual non-bypass identity. Any SECURITY DEFINER wrapper must have fixed search_path, tightly owned authority, no shared financial permissions, no untrusted dynamic SQL, and explicit negative proof of object ACL and cross-tenant isolation.

The next phase must use disposable PostgreSQL 16+ to test actual claim/replay, concurrent same-account and cross-account alias claims, session/account/wallet races, RLS enforcement, idempotency contention, and commit uncertainty under the proposed role architecture. Do not automatically make this inert role a member of a privileged owner or grant it broad schema/table permissions.

There is **no production migration**, runtime LOGIN, authenticated HTTP route, customer activation, merchant/card/payment rail activity, or Pages release in this PR. The historical public Pages P0 remains unresolved. Independent security review and exact-head CI are mandatory before source-only merge.
