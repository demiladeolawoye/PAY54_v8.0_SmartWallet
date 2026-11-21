# PAY54 CR-PAYTAG-01 — PR #59: Restricted authority acceptance matrix and race evidence

## Verified baseline
PR #58 merged to `project-titan` at `a391280905243823d9b442b18768ea8f65b54f82`. Migrations 025–027 retain a SECURITY INVOKER SQL writer and two separate NOLOGIN, NOINHERIT, NOBYPASSRLS roles. No application invocation is enabled.

## Minimum privileged operations needed by the current writer
The following is an **analysis of SQL operations**, not a permission grant or certification of secure runtime execution.

| Relation | Necessary operations for current writer | Risk requiring independent resolution |
|---|---|---|
| `auth_sessions` | SELECT, SELECT FOR UPDATE (requires UPDATE privilege on locked columns in PostgreSQL) | Token/CSRF digests must never be retrievable by app caller |
| `account_contexts` | SELECT + FOR UPDATE | Tenant and owner state changes must serialize against claims |
| `account_memberships` | SELECT + FOR SHARE | Suspended owner must be rejected |
| `wallets` | SELECT + FOR SHARE | Owner/status must match currently bound wallet |
| `personal_wallet_bindings` | SELECT + FOR SHARE | Multiple active bindings fail closed |
| `paytag_registration_requests` | SELECT, INSERT and UPDATE | Replay must bind account, session, principal, alias and request digest |
| `paytag_registry` | SELECT and INSERT | Alias lifetime uniqueness, no owner reassignment |
| `paytag_registry_audit` | SELECT and trigger-performed INSERT | Audit event must be immutable and database generated |

**Non-requirements:** no DELETE, TRUNCATE, table ownership, financial ledger INSERT/UPDATE, schema CREATE, database LOGIN, or privileged role membership. These must remain denied for the callable role. Merely adding these minimum table permissions to the caller is **not acceptable** because it could read customer sessions or insert a PayTag outside the checked function.

## Restricted execution design gate
The future execution-enabled migration needs a `SECURITY DEFINER` boundary owned by a dedicated non-superuser, non-bypass role; exact RLS policies must be scoped to the authoritative transaction, with a safe fixed `search_path` and restricted `EXECUTE` for the callable identity. PostgreSQL RLS policy predicates must be independently reviewed for hostile caller-controlled settings; a `current_setting` value alone must not constitute authentication. SECURITY DEFINER object ownership and permission to ALTER the function must be tested, and the original SECURITY INVOKER entry point must remain protected unless replaced in a separately reviewed migration.

A caller's database role must not directly SELECT `auth_sessions`, inspect digests, update registry/audit, or invoke money functions. Because the existing SQL writer accepts signed request metadata and session digests, backend cryptographic binding and session verification must be rechecked on the same SERIALIZABLE connection before commit. Deadlocks/serialization failures require bounded safe retry, with idempotency and after-commit uncertainty recovery.

## Disposable CI security evidence in this PR
- `021_paytag_writer_negative_lifecycle.sql` tests rejected expired/revoked/rotated sessions, suspended verified account, inactive membership/wallet, wrong CSRF/owner and active multi-wallet ambiguity. Each negative mutation is rolled back in a nested PL/pgSQL subtransaction.
- `022_paytag_writer_concurrency.sh` invokes **the actual writer**, not a direct registry INSERT, from two separate PostgreSQL connections. It verifies that two competing claims for the same verified account cannot both succeed and that only one registry/CLAIMED audit/idempotency result is committed.
- All existing role-security and audit-correlation suites remain in the disposable database workflow.

## Explicit unresolved gates
The concurrent test runs as the disposable privileged database owner. It does **not** establish restricted-role safety, cross-account same-alias concurrency, a session revocation race, or after-commit uncertainty. Those must be exercised under the eventual function-owner/RLS architecture. No production migration, role grant, SECURITY DEFINER conversion, endpoint, PAY54 Pages deployment, customer activation or money movement is part of this PR.

**Protected merge requires exact-head CI, independent database/security review, and separate CTO decision. Production NO-GO.**
