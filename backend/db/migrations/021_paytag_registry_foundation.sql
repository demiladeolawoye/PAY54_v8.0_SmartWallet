-- PAY54 CR-PAYTAG-01 P2A / migration 021: inert canonical registry foundation.
-- PostgreSQL 16+; requires 001–020. Source-only: no production DDL approval.
-- There are deliberately NO runtime grants, write functions, public lookup,
-- privilege-bearing policies, customer records, or financial execution.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $pay54_preflight$
BEGIN
  IF to_regclass('pay54.account_contexts') IS NULL
     OR to_regclass('pay54.personal_wallet_bindings') IS NULL
     OR to_regclass('pay54.account_memberships') IS NULL
     OR to_regclass('pay54.auth_sessions') IS NULL
     OR to_regclass('pay54.paytag_registry') IS NOT NULL
     OR to_regclass('pay54.paytag_registry_audit') IS NOT NULL
  THEN RAISE EXCEPTION 'PAY54_PAYTAG_P2A_MIGRATION_REVIEW_REQUIRED'
       USING ERRCODE = 'P0001'; END IF;
END;
$pay54_preflight$;

-- Alias is ASCII lower-case, globally reserved forever by the UNIQUE key.
-- Tag retirement never frees the alias for assignment to a new beneficiary.
CREATE TABLE pay54.paytag_registry (
  tag_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_alias varchar(24) NOT NULL UNIQUE
    CHECK (
      length(canonical_alias) BETWEEN 3 AND 24
      AND canonical_alias ~ '^[a-z][a-z0-9]*([._-][a-z0-9]+)*$'
      AND canonical_alias !~ '^pay54[._-]'
      AND canonical_alias NOT IN (
        'admin','administrator','api','billing','compliance','fraud',
        'help','identity','legal','official','pay54','payment','payments',
        'root','security','staff','support','system','trust','verified','wallet'
      )
    ),
  owner_account_id uuid NOT NULL
    REFERENCES pay54.account_contexts(id) ON DELETE RESTRICT,
  wallet_id uuid NOT NULL,
  owner_principal_id uuid NOT NULL,
  registry_state varchar(12) NOT NULL
    CHECK (registry_state IN ('RESERVED','ACTIVE','RETIRED')),
  registry_version bigint NOT NULL DEFAULT 1
    CHECK (registry_version BETWEEN 1 AND 9223372036854775806),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  retired_at timestamptz,
  CHECK ((registry_state = 'RETIRED') = (retired_at IS NOT NULL)),
  CONSTRAINT paytag_wallet_account_binding_fk
    FOREIGN KEY (wallet_id,owner_account_id)
    REFERENCES pay54.personal_wallet_bindings(wallet_id,account_id)
    ON DELETE RESTRICT,
  CONSTRAINT paytag_account_owner_tuple_unique
    UNIQUE (tag_id,owner_account_id,owner_principal_id)
);

-- One active or reserved PayTag per account. An immutable retired tag remains
-- reserved in history and cannot be transferred to a different customer.
CREATE UNIQUE INDEX paytag_one_current_tag_per_account
  ON pay54.paytag_registry(owner_account_id)
  WHERE registry_state IN ('RESERVED','ACTIVE');
CREATE INDEX paytag_registry_owner_audit_index
  ON pay54.paytag_registry(owner_account_id,created_at DESC);

-- Database-identity ledger only; no mutable public profile or account number.
CREATE TABLE pay54.paytag_registry_audit (
  audit_id uuid PRIMARY KEY,
  tag_id uuid NOT NULL,
  owner_account_id uuid NOT NULL,
  owner_principal_id uuid NOT NULL,
  event_kind varchar(20) NOT NULL
    CHECK (event_kind IN ('CLAIMED','ACTIVATED','RETIRED','DENIED')),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  correlation_id uuid NOT NULL,
  alias_version bigint NOT NULL CHECK (alias_version > 0),
  CONSTRAINT paytag_audit_registry_fk
    FOREIGN KEY (tag_id,owner_account_id,owner_principal_id)
    REFERENCES pay54.paytag_registry(tag_id,owner_account_id,owner_principal_id)
    ON DELETE RESTRICT
);
CREATE INDEX paytag_registry_audit_lookup
  ON pay54.paytag_registry_audit(tag_id,recorded_at DESC);

-- Default deny under every non-owner role; no RLS policies are provided.
ALTER TABLE pay54.paytag_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.paytag_registry FORCE ROW LEVEL SECURITY;
ALTER TABLE pay54.paytag_registry_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE pay54.paytag_registry_audit FORCE ROW LEVEL SECURITY;
REVOKE ALL ON pay54.paytag_registry FROM PUBLIC;
REVOKE ALL ON pay54.paytag_registry_audit FROM PUBLIC;

-- CRITICAL: The untrusted app role must never receive direct table access.
REVOKE ALL ON pay54.paytag_registry FROM pay54_financial_app_role;
REVOKE ALL ON pay54.paytag_registry_audit FROM pay54_financial_app_role;
REVOKE ALL ON pay54.paytag_registry FROM pay54_financial_audit_role;
REVOKE ALL ON pay54.paytag_registry_audit FROM pay54_financial_audit_role;
REVOKE ALL ON pay54.paytag_registry FROM pay54_ledger_executor_role;
REVOKE ALL ON pay54.paytag_registry_audit FROM pay54_ledger_executor_role;
COMMIT;
