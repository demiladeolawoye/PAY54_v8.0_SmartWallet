# PAY54 CR-PAYTAG-01 — P2B-B2B11 Credential Identity and Provisioning Design

**Source-only planning package. Production and persistent staging remain NO-GO.**

## Verified baseline and outstanding dependency

PR #61 was merged into protected `project-titan` at `7a75a02dbcdfb6bf85f92ac00c14293192fa8cea`. PR #62 introduces an independent disposable-test-only backend restricted executor, but is **still open, awaiting `milade2705` approval** at the time this package is authored. PR #63 is independent of that source and must not imply PR #62 has merged.

Existing PostgreSQL roles `pay54_paytag_register_role` (callable identity) and `pay54_paytag_function_owner_role` (SECURITY DEFINER owner) are intentionally `NOLOGIN`, `NOINHERIT`, `NOBYPASSRLS`, and have no role memberships. The first role may invoke only the restricted function, while the second has narrowly enumerated owner privileges. **No application can directly authenticate to PostgreSQL as a NOLOGIN role.** An actual backend identity must therefore be designed, reviewed, provisioned and demonstrated under database role restrictions before even persistent staging activation.

## Architecture choices requiring independent DBA/security approval

**Option A — dedicated LOGIN identity with narrowly constrained SET ROLE:** a future reviewed migration may create a separate backend LOGIN identity, with exact, non-inheriting membership for a dedicated execution role and audited role-switch semantics. This *changes the existing no-membership invariant* and must not be silently added to migrations 026–028 or tests. Validate SQL privilege inheritance, ability to call other functions, role reset/discard, connection pool leakage and whether the LOGIN role can obtain access other than via the wrapper.

**Option B — dedicated database-authenticated execution principal with separately reviewed role/function ownership design:** provision only after an alternate per-connection mechanism is demonstrated to provide equivalent effective `current_user`, constrained function access, explicit no financial rights, and secure isolation. Avoid granting direct table privileges merely to make the function work.

Neither option is selected or deployed by PR #63. The choice depends on approved infrastructure, PostgreSQL authentication method, secret-management provider and cloud network model.

## Minimum requirements before operator approval

| Layer | Required evidence |
|---|---|
| Source and release | Exact migration SQL SHA-256, protected branch review, signed change request, release and rollback witnesses |
| Workload identity | Dedicated backend principal, restricted trust to exact application workload, least-privilege network egress |
| Database identity | Independently captured LOGIN/session_user/current_user/membership graph, direct DML denial, no financial function authority |
| Transport | Actual TLS server certificate and hostname verification, certificate/trust rotation, private database endpoint |
| Secret custody | Named secret manager and scoped read-only workload access, no plaintext credentials in repository/actions/logs |
| Credential rotation | Two-generation overlap or planned cutover, connection drain, revocation witness, tested recovery |
| Pool isolation | Connection checkout identity attestation, no cross-principal reuse, discarded connections on errors and commit uncertainty |
| Request authority | Authenticated session and CSRF, HMAC key source, bound idempotency, SERIALIZABLE transaction and bounded retry reconciliation |
| Monitoring | Redacted logs, security audit events, role/ACL drift alerts, expiry/revocation races and incident kill switch |
| Human sign-off | Independent DBA, security reviewer and release manager approvals, authorised staging-only change window |

## Controls enforced by this PR

`backend/governance/paytag-credential-identity-review.mjs` validates a strictly shaped **non-secret** design request requiring disposable-only review, no selected cloud provider, no provisioned secrets, no activated database identity and no deployment. It fails on unknown fields, claimed live credentials, staging/production selection, and attempts to enable migration, credential provisioning or runtime. Even a passing shape review explicitly reports **zero deployment/credential/financial authorisation**.

The review is not evidence of actual cloud IAM, TLS, database credentials, a PostgreSQL principal, or a signed DBA approval. Do not pass real credentials to the policy, GitHub PR comments or ChatGPT. A separate production-grade implementation requires real attestation plus an approved deployment architecture.

**Release hold:** no migration 029; no LOGIN, GRANT, SET ROLE, application connection, service token, secret-manager deployment, HTTP endpoint, customer registration or money movement in this PR. PAY54 remains production NO-GO.
