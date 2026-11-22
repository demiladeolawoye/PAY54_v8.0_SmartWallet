# PAY54 CR-PAYTAG-01 P2B-B2B10 — Backend Runtime Admission & Connection Security

**Protected source baseline:** PR #61 merged to project-titan at `7a75a02dbcdfb6bf85f92ac00c14293192fa8cea`.

## Architecture decision and compatibility

The existing `backend/src/postgres-paytag-registration-executor.mjs` invokes `pay54.register_paytag_trusted`, which is not callable by `pay54_paytag_register_role` since migration 028. This obsolete source adapter has deliberately NOT been changed or activated because existing unit tests and downstream integration may depend on it. PR #62 adds a separately named, disposable-test-only adapter that calls `pay54.register_paytag_restricted` and reuses the existing registered admission and HMAC binding modules. A later reviewed release must explicitly retire or replace the legacy adapter.

The new adapter accepts only `environment: "disposable-test"`, injects a disposable client factory, and does not import a PostgreSQL driver or create a cloud connector. No HTTP route is mounted and no secrets are loaded or stored.

## Security mechanism

- The admission resolver validates a server-resolved active session, owner identity, version, and time window. The request binder rejects client-submitted account/wallet/principal/privilege fields and derives token/CSRF digests and per-account idempotency digest from a server-only 256-bit HMAC key.
- The adapter opens a SERIALIZABLE READ WRITE transaction and sets short LOCAL statement and lock timeouts. Before invoking SQL, a parameter-free role-query checks `current_user` equals the dedicated non-login callable role, requires EXE­CUTE only on `register_paytag_restricted`, rejects direct access to session, registry, audit, idempotency, and ledger tables, and rejects membership/role escalation. The actual SQL function independently revalidates ownership under row locks.
- SQL uses eleven positional bound parameters, never interpolates request input into SQL, returns only tag/request IDs and replay status, and has no payment authority. This adapter never retries; especially after COMMIT uncertainty, it cannot report success or issue a second registration.
- An injected connection is discarded physically on all paths, including success, SQL error, rollback failure and unknown commit result. Buffers holding credential digests are overwritten after query completion.

## Necessary follow-up controls (not proven by this source)

A database role marked `NOLOGIN` cannot log in directly. A production connection would require a separately approved login identity with a narrowly constrained, independently proven mechanism to assume `pay54_paytag_register_role`. The current migration explicitly prohibits role memberships. **No supported production role-switching or connection architecture has been approved**; neither a test client's `current_user` claim nor a mock constitutes genuine network identity/TLS/IAM assurance.

Before any persistent staging deployment, security and DBA reviewers must approve (a) an authenticated backend service/secret-manager configuration and a physical connection origin, (b) role assumption or a new safely scoped connection design, (c) actual PostgreSQL role-membership and ACL proof, (d) session credential rotation, CSRF transport, request rate limiting, (e) contention/after-commit reconciliation strategy, (f) structured redacted audit telemetry, (g) incident kill switch and rollback, and (h) migration-specific staging approval. Signed evidence from the target cloud and real PostgreSQL instance is required. No secrets should be committed or posted in reviews.

## Test acceptance

`.github/workflows/pay54-paytag-backend-source.yml` uses read-only GitHub permissions, exact PR-head checkout, pinned Node 24, no secrets or deployment permissions, new negative tests plus existing admission/request-binding regressions. The existing disposable PostgreSQL CI continues to verify migration 028, owner ACLs, session revocation, cross-account alias contention and audit linkage.

**No production or persistent-staging database, deployment, HTTP endpoint, customer registration or financial execution was enabled. PAY54 production NO-GO.**
