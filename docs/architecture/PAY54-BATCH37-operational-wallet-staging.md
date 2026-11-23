# PAY54 Batch 37 — Actual Wallet Staging: Operational Verification and Release Design

**Baseline:** PR #76 protected merge `8dc702b26ac55a038eef75509146970f51194ec2`.

## Scope and material findings

The current wallet SQL reader in `backend/db/tests/batch22/031_restricted_wallet_read_disposable.sql` is explicitly rollback-only. `pay54_wallet_read_owner_role` and `pay54_wallet_read_caller_role` are both NOLOGIN, and the callable function does not persist. A green GitHub check therefore does not establish working staging credentials or any accessible customer-wallet endpoint.

The source audit `backend/security/staging-cloud-readiness.mjs` targets project `pay54-staging-uk-01` but expressly marks live IAM, secrets, billing and deployment evidence NOT_VERIFIED. The new `pay54-wallet-staging-operational-evidence.mjs` **reuses** that source audit and maintains eight evidence gates, all independently outstanding.

## Permanent restricted PostgreSQL wallet-read migration — design for approval

The existing temporary SQL function is the starting security proof, **not an approved forward migration**.

**Forward release prerequisites** (to be independently signed by DBA and Security):

1. Freeze a reviewed schema inventory and capture SHA-256 digests of every forward and rollback SQL file, the database role graph and every RLS policy.
2. Obtain a dedicated database service LOGIN mapped to `pay54_wallet_read_caller_role` with no inherited privileges, no superuser or bypass-RLS privilege. Verify the physical PostgreSQL login, allowed `SET ROLE`, role reset and revoked membership behavior. Do not re-use PayTag or ledger executor identities.
3. Review all owner-role SELECT permissions on session, account, membership, wallet, journal, ledger entries and reservations. Apply explicit FORCE RLS and actor/wallet/ledger predicates. Restrict EXECUTE to the dedicated caller alone; revoke PUBLIC grants in the same migration.
4. The future read function must bind an independently verified session digest and current session version under database authority, reject mixed account/wallet/currency and return a bounded read-only accounting projection with no financial DML.
5. Production requests must run in verified `REPEATABLE READ READ ONLY`, with a *new, committed-state* post-read revocation fence that cannot reuse the old snapshot; alternatively use an independently proven serialisation strategy. A second read in the original RR transaction is **not sufficient**.
6. Validate real funded POSTED, HELD, release, capture, reversal, expiry, account switch and revocation races under the actual new service LOGIN, including pool reuse and connection failures.
7. Deploy only by an approved, audited change with verified preflight, rollout health metrics and independent operator confirmation.

**Rollback design:** first disable the API feature flag and revoke the function's caller EXECUTE grant, then drain in-flight reads and the database pool. Preserve immutable audit evidence. Once no active use remains, drop only the specifically reviewed function/policies and the associated non-shared role grants; restore prior RLS policy definitions from a signed baseline. Recheck that PayTag, account and ledger privileges remain unchanged. Physical rollback must be rehearsed on a disposable copy of the target staging schema before any persistent migration is authorised. **This package intentionally supplies no executable forward/rollback migration for staging.**

## Physical PostgreSQL session-revocation race

`032_wallet_revocation_snapshot_race.sh` starts two independently connected PostgreSQL sessions: transaction A acquires a `REPEATABLE READ` snapshot while transaction B commits a token-session revocation and version increment. A continues to observe its old snapshot; a third **fresh committed-state** read must observe the revocation. CI fails if any assertion does not hold.

This is a regression proving the isolation hazard and the need for an external revocation fence. It is **not** a proof that a production API already uses that fence. A separate full restricted-function lock/timeout test is still required.

## Identity, TLS and credential custody

The repository has disposable PostgreSQL verify-full TLS and credential rotation tests, but these test synthetic certificates only. Before persistent staging, DevSecOps must independently attest the effective GCP workload service account, GitHub OIDC audience/repository/branch/environment restrictions, Secret Manager secret metadata (never values), database CA and exact hostname, rotation and revocation paths, audit logging, private ingress, egress and recovery. The proposed environment is `pay54-staging-uk-01`; project existence and current active IAM grants are not attested in this package.

## Backend API and customer dashboard

Batch 36's authenticated session-to-accounting bridge remains an opt-in backend interface. It cannot be treated as a deployed endpoint until a real independently verified identity provider, physical restricted database login, secure transport, distributed rate limits, audit and request deadlines are available.

The customer dashboard presenter explicitly requires `availableMinor` and a dedicated approved server response. Batch 37's new regression rejects an unapproved `postedMinor`/`heldMinor` accounting envelope and verifies that no balance is rendered. The existing mobile-first dashboard and account-switch tests remain in protected CI; physical iOS/Android, desktop browsers, keyboard and screen-reader acceptance still need signed test evidence.

## Provider-backed funds semantics

A legitimate available balance must account for the sign convention of customer liability accounts, settled versus unsettled funding, active HELD amounts, releases, captures, reversals, chargebacks, disputes, fees, processor settlement timing, FX currency precision and ledger reconciliation. The arithmetic `posted - HELD` is **not** approved spendable money. Until a contracted provider supplies settlement and reconciliation evidence, the real-wallet API/UI stays blocked.

## Operational release ownership

| Gate | Owner | Required external evidence | Source status |
| --- | --- | --- | --- |
| Migration and rollback | Principal DBA / Security | Signed restricted-function DDL/ACL/RLS and rehearsal | NOT VERIFIED |
| Cloud IAM | DevSecOps / Security | Effective-role and service identity inventory | NOT VERIFIED |
| TLS and secrets | Security / DevSecOps | Real hostname/CA, rotation, custody audit | NOT VERIFIED |
| Revocation concurrency | DBA / QA | Physical fresh-commit fence plus restricted client race | PARTIAL — isolation hazard demonstrated |
| Provider-backed funds | Fintech Architect / Compliance | Settlement and financial availability acceptance | NOT VERIFIED |
| Authenticated API | Backend Security | Verified live route and account-bound DB principal | NOT VERIFIED |
| Mobile/desktop acceptance | Frontend / Mobile QA | Devices, responsive view, WCAG, errors and switching | NOT VERIFIED |
| Release operations | Release Manager | Monitoring, approved change, rollback and incident plan | NOT VERIFIED |

**GO/NO-GO:** Source-only integration tests permitted. Persistent staging NO-GO. Production NO-GO. No real-money settlement, account balance exposure or financial activation is authorised.
