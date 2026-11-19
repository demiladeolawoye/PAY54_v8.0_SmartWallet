# PAY54 Batch 23 / 914 — Controlled Staging Database Provisioning Plan

**State:** Plan only. No PAY54 staging cluster, login, secrets, migrations or endpoint activation has been provisioned by this source cycle.
**Authority required:** Founder, CTO, Security, DBA, DevSecOps, Compliance, Release Manager.

## Approved preconditions

- Obtain reviewed PostgreSQL hosting region, data residency/legal basis, network isolation, TLS root CA, KMS key policy, 24-hour backup verification, audit retention and disaster recovery objective.
- Verify GitHub protected branches and Actions environments, OIDC trust subject, least-privileged deployment identity, two-person review and rollback; repo-level ruleset metadata alone does not establish these.
- Inventory and checksum canonical migrations 001–013 and additive 014–018. Verify migration 018's restricted function owner; do not run wildcard or combine legacy SQL test fixtures with Batch 23 tests.
- Preserve RLS `FORCE` on canonical `account_contexts`, `account_memberships`, `auth_sessions` and `account_context_audit`.

## Identity and database privileges

1. DBA applies ordered reviewed migrations using a short-lived migration identity (not a runtime service account). The rotation migration creates two **different** non-login groups: `pay54_session_rotate_role` (function execution only) and `pay54_session_rotate_executor_role` (restricted function owner, NOLOGIN/NOBYPASSRLS with no role members).
2. Establish three distinct staging-only login identities in an IAM-controlled, secret-managed process. Scope them exclusively to session reader, account directory reader and function-only session rotator. **Never** attach a login to the restricted function owner or financial ledger executor.
3. Each connector must verify its *effective PostgreSQL current_user* matches its expected restricted role before sensitive reads/writes. A user name in a connection string is not equivalent to a verified role; no service may use postgres/superuser fallback.
4. Use TLS certificate verification, non-identical 32+ character secrets and redacted connection diagnostics. No plaintext credentials or SSH keys in GitHub issues, Pages, repository files, CI output or application logs.
5. Rotate database credentials independently of customer sessions; validate session lifecycle, backpressure and pool quarantine after uncertain commit.

## Staging rollout sequence (separate approved change)

- Apply migrations only to a disposable restored snapshot first. Verify catalog ownership, RLS policies, ACLs, function ownership/search_path, no new inherited privileges and independent tenant negative tests.
- In isolated staging, run schema-drift and role probes, two-client old-token replay, forged actor/CSRF, audit conflict rollback, cross-business membership revocation and browser cache tests.
- Provision a secure session issuance/reauthentication service and explicit session-to-identity binding *before* enabling any protected account-list route. The current code has only a read resolver and rotation adapter, not customer session issuance.
- Implement verified future HTTP ingress with TLS, Origin/CSRF, rate limiting, body constraints, secure credentials, redacted logging, correlation IDs and account-switch CAS responses. The existing foundation HTTP 503 remains correct until then.
- Treat every real-money/card/ledger feature as a separate operational approval. Never infer payment authority from a successful context switch.

## Exit criteria

Signed staging evidence for role/RLS, session replay, rollback, Pages containment, regulated partner acceptance and real-device QA must reference the exact reviewed commit and be checked by independently provisioned Ed25519 trust roots. Human Founder/Security/Compliance/Release authorisation is separate, even if all automated gates pass.

**Current release outcome:** NO-GO; none of the above provisioning steps has been represented as completed.
