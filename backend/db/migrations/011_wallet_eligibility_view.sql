-- PAY54 BATCH 03 / MIGRATION 011 — LIVE LIFECYCLE ACCOUNT-WALLET ELIGIBILITY
-- PostgreSQL 16+; requires migrations 001–010. Source-only, no data writes.
-- SECURITY INVOKER preserves the caller's RLS/role constraints.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

DO $$
BEGIN
 IF to_regclass('pay54.personal_wallet_bindings') IS NULL
    OR to_regclass('pay54.account_memberships') IS NULL
 THEN RAISE EXCEPTION 'Account binding foundation migrations 001–010 required'; END IF;
 IF to_regclass('pay54.eligible_personal_wallet_bindings') IS NOT NULL
 THEN RAISE EXCEPTION 'Read eligibility view already exists'; END IF;
END;
$$;

CREATE VIEW pay54.eligible_personal_wallet_bindings
 WITH (security_invoker=true,security_barrier=true)
AS
 SELECT b.account_id,b.wallet_id,a.legal_owner_subject AS principal_subject
 FROM pay54.personal_wallet_bindings b
 JOIN pay54.account_contexts a ON a.id=b.account_id
 JOIN pay54.wallets w ON w.id=b.wallet_id
 JOIN pay54.account_memberships m
   ON m.account_id=a.id AND m.principal_subject=a.legal_owner_subject
 WHERE a.account_type='PERSONAL'
   AND a.status='ACTIVE'
   AND a.verification_status='VERIFIED'
   AND m.role='PERSONAL_OWNER'
   AND m.status='ACTIVE'
   AND w.status='ACTIVE'
   AND w.owner_subject=a.legal_owner_subject;

REVOKE ALL ON pay54.eligible_personal_wallet_bindings FROM PUBLIC;
REVOKE ALL ON pay54.eligible_personal_wallet_bindings FROM pay54_financial_app_role;
REVOKE ALL ON pay54.eligible_personal_wallet_bindings FROM pay54_financial_audit_role;
REVOKE ALL ON pay54.eligible_personal_wallet_bindings FROM pay54_ledger_executor_role;

-- No new RLS policies, grants, application credentials or financial privileges.
COMMIT;
