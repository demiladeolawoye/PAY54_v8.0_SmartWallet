# PAY54 Batch 26 / 1056 — Four-Role PostgreSQL Effective Privilege Acceptance

**Decision:** source-only database role evidence is not equivalent to actual effective IAM/RLS testing. No staging or production database was touched.

The security boundary comprises session read, canonical account directory read, account transition and initial session issuance. They must use **four distinct login credentials** with separate TLS-validated connection pools. The SQL caller roles must be restricted: `pay54_session_read_role`, `pay54_account_directory_read_role`, `pay54_session_rotate_role`, and `pay54_session_issue_role`. The two function owners remain separate NOLOGIN/NOBYPASSRLS/NOINHERIT principals; SQL callers have function EXECUTE only for writes, and never direct ledger/session DML.

**Operator-proven checks:** authenticated `current_user`, `session_user`, `pg_auth_members`, table/function grants, schema CREATE revocation, fixed function search_path, FORCE ROW LEVEL SECURITY, restrictive row-level policies, actual TLS server identity and no inherited superuser/bypass privilege. Verify these under all four real login roles, not a DBA's impersonation alone.

Run migrations **001–020** only after independent signed SHA-256 byte manifest verification, change ticket, backup and restore rehearsal. Test original account membership semantics, Personal account legal owner, Business verification, revoked membership, session read token digest matching, initial binding, audit atomicity and two concurrent JTI/session transitions. Verify database failover cannot disclose an uncertain token.

Any privilege conflict, stale migration hash, failed TLS check, role reuse, missing secret rotation or unverified RLS leaves staging **BLOCKED**.