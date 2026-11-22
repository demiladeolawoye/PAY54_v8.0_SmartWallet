# PAY54 CR-PAYTAG-01 — P2B-B2B12 (PR #64): disposable database LOGIN / role-assumption proof

## Verified source baseline

Protected `project-titan` includes PR #62 (merge `baf89fd4f7b2fbe7d9383eafdc9a98f77508bb1f`) and PR #63 (merge `8f435debd1f1a3b0337c269044cd08f465ed97a2`). PostgreSQL migrations 026–028 intentionally leave the callable PayTag role `pay54_paytag_register_role` as `NOLOGIN` and grant no role memberships. A real backend database authentication mechanism remains an outstanding deployment design.

## Disposable-only demonstration

`backend/db/tests/batch22/026_paytag_disposable_login_role.sh` is run **only** inside a GitHub Actions disposable PostgreSQL 16 service container, after the existing migration, restricted SQL execution, revocation and race regression tests. It creates a temporary test LOGIN role with **no password**, which connects only through the ephemeral container's *local Unix socket trust*. It is not, and must not be mistaken for, production authentication.

The CI fixture explicitly creates a single membership:

`GRANT pay54_paytag_register_role TO pay54_paytag_ci_login WITH ADMIN FALSE, INHERIT FALSE, SET TRUE;`

The test verifies:
- Unswitched login does not inherit schema privileges, session SELECT or wrapper EXECUTE.
- A **physically separate database connection** has `session_user=pay54_paytag_ci_login`; a transaction-local `SET LOCAL ROLE` yields only `current_user=pay54_paytag_register_role`.
- Direct session, registry, audit and ledger DML remains denied under the callable role; the internal trusted SQL writer is not executable.
- COMMIT and ROLLBACK reset effective identity back to the login role, preventing privilege leakage across transactions.
- Revoking the sole membership disables subsequent role assumption on a **new login session**.
- The disposable login is dropped; the original PayTag callable and function-owner roles remain unchanged and without memberships.

## Security boundaries and explicit omissions

This proof temporarily changes the role membership invariant **only in the disposable service container**, not in the canonical migration files or any persistent database. It does not create migration 029, change RLS, install credentials, grant a production login, change IAM, activate an HTTP route, or touch payment rails. If CI fails, the ephemeral container is discarded, not promoted. This is source-only design evidence and cannot become a deployment script.

**Critical unresolved issues before a real login identity can be approved:**

1. Determine approved hosting/database provider, managed PostgreSQL authentication mechanism, private networking and exact trusted service identity. Container local-socket trust proves NONE of these.
2. Validate PostgreSQL role-assumption behaviour on the target managed provider and prove that an authenticated workload cannot impersonate superusers, function owners or financial roles.
3. Design secret-manager custody, service-token and HMAC lifecycle, TLS server and hostname verification, credential rotation and physical pool reset/discard. The existing `backend/src/paytag-restricted-registration-preview.mjs` remains `disposable-test` only.
4. Incorporate provider-validated receipt reconciliation after COMMIT uncertainty, transaction pooling hazards, connection loss and independent DBA security review.
5. Authorise a separate staging-only change ticket and controlled migration/downgrade strategy. Never apply the CI test-role script to staging or production.

No PAY54 production change, persistent staging activation, customer PayTag registration or real-money execution is authorised. **PAY54 remains production NO-GO.**
