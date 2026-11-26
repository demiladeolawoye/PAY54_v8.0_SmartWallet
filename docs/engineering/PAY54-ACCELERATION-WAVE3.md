# PAY54 Acceleration Wave 3 — Authenticated Wallet Read Integration

26 November 2026. Source-only, unmounted and no deployment. Stacked on independently approved PR #99.

## Delivered executable integration
The backend reader validates an authentic 256-bit bearer credential with existing `postgres-session-resolver.mjs`, derives its SHA-256 digest without exposing the credential, starts a `REPEATABLE READ READ ONLY` PostgreSQL transaction, verifies the runtime role is exactly `pay54_wallet_read_caller_role`, and calls the existing reviewed `pay54.wallet_read_restricted_v1` PostgreSQL function using bound digest/account/wallet/currency parameters. This database function independently validates live session, personal ownership, verified membership and wallet balance under reviewed FORCE RLS policies. The adapter rejects any empty, duplicated or mismatched result, converts the monetary values with the Wave 2 exact BigInt read model, commits, and finally releases the connection. Failure rolls back, never returns a model, and disposes the connection if rollback fails.

A deliberately **unmounted** GET-only handler demonstrates the API boundary with a no-store response. It rejects non-read methods and untrusted result shapes, and does not reveal database or bearer details. It is NOT a deployed endpoint; router security (rate limiting, CSRF policy, TLS, logging, abuse prevention), connection ownership and service role provisioning remain unverified.

## Tests
- Genuine token-digest extraction, parameter binding, correct read-only transaction/role, exact minor-unit wallet projection, transfer-disabled result.
- Missing wallet, wrong role/read-only posture, mismatched wallet/owner/currency, invalid bearer, overspending snapshot, failed COMMIT and failed ROLLBACK behaviour.
- GET boundary does not permit money methods, leaks no database errors, and never trusts an execution-enabled model.
- Full existing disposable PG16 suite is run against the cumulative branch on this change.

## Financial writer scope and integration
Financial writer identity and canonical positive reserve/capture/release remain unresolved P0 work requiring independently reviewed DBA/Security implementation, real SQL role tests and transaction-bound authenticated session and revocation locks. No financial permissions, migrations or live-money API are created here.

## Controlled source integration
The cumulative stack remains PRs #92–#99 plus this new review candidate, not a protected branch merge. Before any source-only merge, pin all exact heads, reconcile CI workflows, run complete integration regression, obtain independent Security/Release review and a separate source merge authorisation. A source merge cannot approve cloud spending or production.

**Cloud spending not approved. Managed staging NO-GO. Production NO-GO.**
