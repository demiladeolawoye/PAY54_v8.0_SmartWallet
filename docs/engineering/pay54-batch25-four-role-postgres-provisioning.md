# PAY54 Batch 25 / 1011 — Four-Role PostgreSQL Staging Provisioning and Migration Control

**Status:** Operational procedure for independently approved staging. No staging database, login, role membership or migration was provisioned or changed in this source cycle.

## Canonical schema

Apply reviewed, externally signed migrations **001–020 in exact ascending order**, preserving established account contexts, memberships and migration 013's deny-only reader policy. Migrations 019/020 extend Batch 23's session infrastructure; do not create parallel account tables or alter the ledger DML boundary.

The shared `verifyPay54MigrationDrift` retains 001–018 compatibility and supports 001–020 when called with the immutable `PAY54_BATCH25_FULL_MIGRATION_ORDER`. Source SHA-256 fingerprints are **not** an independently signed release manifest.

## Runtime identity segregation

| Login role purpose | PostgreSQL NOLOGIN group role | Required permission |
| --- | --- | --- |
| Credential reader | `pay54_session_read_role` | Restricted RLS SELECT |
| Account directory reader | `pay54_account_directory_read_role` | Restricted canonical account/membership SELECT |
| Account session transition caller | `pay54_session_rotate_role` | Function EXECUTE only |
| Initial bootstrap issuer caller | `pay54_session_issue_role` | Function EXECUTE only |

**Never grant LOGIN membership** to `pay54_session_rotate_executor_role` or `pay54_session_issue_executor_role`, nor to database owners, superuser or ledger execution identities. Function owners must stay NOLOGIN/NOBYPASSRLS/NOINHERIT with restricted table column rights and fixed search paths.

## Operator procedure

1. Obtain approved UK region/backup/PITR, TLS CA, private network connectivity, secrets management, IAM hierarchy and independent DBA change number. Validate a restored disposable copy first.
2. Verify manifest signatures, checksum every migration and check `pg_roles`, `pg_auth_members`, `pg_policies`, forced RLS, function ownership/search paths, column ACLs and no indirect inherited permissions.
3. Provision four **distinct** staging-only login identities via authorised DBA/IAM change. Use separate secrets, rotate them independently, and never expose credentials to GitHub Pages, public workflow logs or personal browsers.
4. Probe actual effective `current_user` using the existing three-role and new fourth-role read-only probes. Confirm no bypass, no direct session/audit DML for callers and no ledger permissions.
5. Test two independent real staging principals; authorised initial binding and subsequent Business selection; revoked membership, stale token, concurrent replay, audit rollback, clock failure and forced DB disconnect.
6. Preserve audit, perform PITR restoration rehearsal and independently sign QA evidence for exact code SHA. Keep foundation routes 503 until trusted issuer, rate-limiter and device tests are separately approved.

**Current result:** Source and disposable CI only. CR-DB-01 / CR-ACCOUNT-02 OPEN; staging and production NO-GO.