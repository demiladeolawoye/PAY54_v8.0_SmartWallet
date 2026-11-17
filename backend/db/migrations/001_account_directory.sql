-- PAY54 Batch 22 / 818: account directory foundational migration.
-- Requires a separately provisioned migration role. Runtime service role MUST
-- be non-owner, non-superuser, NOBYPASSRLS and limited to SELECT only.
-- Do not apply to production without schema review and backup/rollback signoff.
BEGIN;

CREATE SCHEMA IF NOT EXISTS pay54;
REVOKE ALL ON SCHEMA pay54 FROM PUBLIC;

CREATE TABLE IF NOT EXISTS pay54.accounts (
  account_id uuid PRIMARY KEY,
  legal_owner_id uuid NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('PERSONAL','BUSINESS')),
  display_name text NOT NULL CHECK (
    length(display_name) BETWEEN 1 AND 120 AND
    display_name = btrim(display_name) AND
    display_name !~ '[<>]'
  ),
  account_status text NOT NULL CHECK (
    account_status IN ('PENDING_VERIFICATION','ACTIVE','SUSPENDED','CLOSED')
  ),
  verification_status text NOT NULL CHECK (
    verification_status IN ('NOT_VERIFIED','IN_REVIEW','VERIFIED','REJECTED')
  ),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK (account_status <> 'ACTIVE' OR verification_status = 'VERIFIED')
);

CREATE TABLE IF NOT EXISTS pay54.account_memberships (
  account_id uuid NOT NULL REFERENCES pay54.accounts(account_id) ON DELETE RESTRICT,
  principal_id uuid NOT NULL,
  member_role text NOT NULL CHECK (
    member_role IN (
      'PERSONAL_OWNER','BUSINESS_OWNER','BUSINESS_ADMIN',
      'BUSINESS_OPERATOR','BUSINESS_VIEWER'
    )
  ),
  member_status text NOT NULL CHECK (
    member_status IN ('ACTIVE','INVITED','SUSPENDED','REVOKED')
  ),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (account_id, principal_id)
);

CREATE INDEX IF NOT EXISTS pay54_memberships_principal_index
  ON pay54.account_memberships (principal_id, member_status, account_id);

ALTER TABLE pay54.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54.account_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.account_memberships FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pay54_memberships_actor_read ON pay54.account_memberships;
CREATE POLICY pay54_memberships_actor_read ON pay54.account_memberships
  FOR SELECT
  USING (
    principal_id = NULLIF(current_setting('pay54.actor_id', true), '')::uuid
    AND member_status = 'ACTIVE'
  );

DROP POLICY IF EXISTS pay54_accounts_actor_read ON pay54.accounts;
CREATE POLICY pay54_accounts_actor_read ON pay54.accounts
  FOR SELECT
  USING (
    account_status = 'ACTIVE' AND verification_status = 'VERIFIED'
    AND EXISTS (
      SELECT 1
      FROM pay54.account_memberships m
      WHERE m.account_id = accounts.account_id
        AND m.principal_id = NULLIF(current_setting('pay54.actor_id', true), '')::uuid
        AND m.member_status = 'ACTIVE'
    )
  );

-- Provision only an audited runtime role outside this migration, then grant
-- USAGE ON SCHEMA pay54 and SELECT on the two tables; never grant DML or DDL.
-- A runtime role that owns these objects or has BYPASSRLS is forbidden.
COMMIT;
