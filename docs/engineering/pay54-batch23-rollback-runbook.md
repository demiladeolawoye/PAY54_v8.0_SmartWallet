# PAY54 Batch 23 / 911 — Secure Account Context Rollback Runbook

**Status:** Proposed operational procedure; NOT exercised against a PAY54 staging or production environment.
**Owners:** Group CTO, Principal Security Engineer, Principal DevSecOps, DBA, Release Manager.
**Hard rule:** Source code and disposable CI do not authorise a deployment.

## Preconditions for any future staging change

1. Record immutable Git commit, migration filenames and SHA-256 fingerprints, full DB schema revision, deployed artifact identity, IAM/OIDC role and current Pages publication artifact.
2. Require independent DBA/Security approval, a verified encrypted backup/PITR point, restoration rehearsal evidence, and unique change/incident identifiers.
3. Establish a temporary change freeze on account-context operations and regulatory payment rails. Keep real-money operations disabled while the foundations are unprovisioned.
4. Collect separate verified role membership and audit privileges; ensure `pay54_session_rotate_role` has EXECUTE only and `pay54_session_rotate_executor_role` remains NOLOGIN, NOINHERIT, NOBYPASSRLS with no member login.
5. Confirm independently signed staging attestation, real cross-tenant denial, concurrency/replay proof and current client rollback readiness.

## Triggers requiring immediate halt

- Any cross-tenant account or wallet visibility, stale Personal/Business balance after switching, wrong-role grant, RLS policy regression or unauthorised row write.
- Unexpected authentication or CSRF rejection distribution, two successful rebinds for one old token, missing durable audit for a committed rotation, or database serialization anomalies exceeding recovery safeguards.
- Uncertain SQL COMMIT, unexpected failover/pool reuse, clock skew causing session-expiry errors, compromised signing keys, GitHub Pages exposure or leaked provider credentials.

## Immediate containment — operator actions only

1. Stop the account-context transition service and deny account-context HTTP routes. Preserve existing `503 ACCOUNT_CONTEXT_SERVICE_UNAVAILABLE` until an independently approved recovery.
2. Revoke runtime credentials/role memberships **through an authorised IAM/DBA change**. Do not grant BYPASSRLS, superuser or table-owner privileges as an emergency workaround.
3. Preserve append-only auth and account-context audit, immutable workflow logs, migration evidence and request correlation IDs. Never erase evidence to make tests green.
4. If COMMIT outcome is uncertain, discard the connection, do not disclose a new token, terminate the affected session lineage through an authorised revocation service and require reauthentication; do not replay a non-idempotent write blindly.
5. Keep ledger execution, cards and provider settlement disabled where appropriate to prevent cross-account financial misattribution; involve safeguarding/compliance incident response.

## Data restoration and forward repair

- Do **not** run speculative `DROP TABLE`, blanket `DELETE`, role grants, or reverse earlier financial-ledger migrations.
- Prefer a reviewed forward-only migration or explicit transaction-safe security fix; restore from PITR to a separately isolated copy when rollback requires data correction.
- Verify referential integrity of account contexts, memberships, auth session version/expiry/revocation and audit before reopening any route.
- Confirm `account_context_audit` has one committed record per committed rebind and no record for a rolled-back rebind. Reconcile against trusted security event identifiers.
- Compare actual deployed schema and RLS/ACL posture with reviewed migration fingerprints; rerun real-PostgreSQL adversarial tests with two independent staging principals and role separation.

## Recovery acceptance

Release Manager, Security, DBA and Founder must approve recovery separately. Re-run Android, iOS, desktop, multi-tab and accessibility/account-cache regression, plus old-token rejection and ledger/card isolation. Verify rollback rehearsals and Pages artifact containment. No self-reported SQL assertion or green GitHub badge alone can reopen customer switching.

**Current disposition:** No actual staging/database deployment or rollback has occurred; every operational gate remains unverified.
