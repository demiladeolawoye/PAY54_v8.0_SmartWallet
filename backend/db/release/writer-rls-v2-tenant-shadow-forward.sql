-- PAY54 Wave10 — Tenant-scoped financial policy SHADOW CANDIDATE.
-- All policies are PERMISSIVE SELECT with an unconditional FALSE guard.
-- Together with Wave9 RESTRICTIVE DENY they CANNOT authorize any money.
-- Disposable PG16 ONLY; this is NOT a deployable migration.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='25s';
DO $pre$
BEGIN
 IF current_database()<>'pay54_disposable_ci' OR session_user<>'postgres'
 OR current_user<>'postgres'
 OR to_regprocedure('pay54.wallet_read_restricted_v1(bytea,uuid,uuid,character varying)') IS NULL
 OR (SELECT count(*) FROM pg_policies WHERE schemaname='pay54'
  AND policyname LIKE 'pay54_w9_deny_%' AND permissive='RESTRICTIVE')<>5
 OR EXISTS (SELECT 1 FROM pg_policies
  WHERE schemaname='pay54' AND policyname LIKE 'pay54_w10_scope_%')
 THEN RAISE EXCEPTION 'PAY54_W10_SHADOW_PRECONDITION'; END IF;
END $pre$;

-- The scope expression is informational until a separately approved trusted
-- session context exists. A user-controlled GUC is NEVER authentication.
-- Retaining FALSE is a hard security requirement; no grants accompany this.
CREATE POLICY pay54_w10_scope_wallet ON pay54.wallets
 AS PERMISSIVE FOR SELECT TO pay54_writer9_owner_candidate
 USING (
   false AND EXISTS(
     SELECT 1 FROM pay54.auth_sessions s
     JOIN pay54.account_contexts a ON a.id=s.active_account_id
     JOIN pay54.account_memberships m
       ON m.account_id=a.id AND m.principal_subject=s.principal_id
     WHERE s.principal_id=wallets.owner_subject
       AND a.legal_owner_subject=s.principal_id
       AND a.account_type='PERSONAL'
       AND a.status='ACTIVE' AND a.verification_status='VERIFIED'
       AND m.role='PERSONAL_OWNER' AND m.status='ACTIVE'
       AND s.session_status='ACTIVE' AND s.revoked_at IS NULL
       AND s.issued_at<=clock_timestamp() AND s.expires_at>clock_timestamp()
       AND s.session_version>0
       AND s.token_digest=decode(NULLIF(current_setting('pay54.w10_token',true),''),'hex')
   )
 );
CREATE POLICY pay54_w10_scope_account ON pay54.ledger_accounts
 AS PERMISSIVE FOR SELECT TO pay54_writer9_owner_candidate
 USING (false AND EXISTS(
   SELECT 1 FROM pay54.wallets w
   WHERE w.id=ledger_accounts.wallet_id
     AND w.status='ACTIVE'
     AND ledger_accounts.account_class='CUSTOMER_LIABILITY'
     AND ledger_accounts.status='OPEN'
     AND EXISTS(
       SELECT 1 FROM pay54.auth_sessions s
       JOIN pay54.account_contexts a ON a.id=s.active_account_id
       JOIN pay54.account_memberships m ON m.account_id=a.id
         AND m.principal_subject=s.principal_id
       WHERE s.principal_id=w.owner_subject
         AND a.legal_owner_subject=s.principal_id
         AND a.account_type='PERSONAL' AND a.status='ACTIVE'
         AND a.verification_status='VERIFIED'
         AND m.role='PERSONAL_OWNER' AND m.status='ACTIVE'
         AND s.session_status='ACTIVE' AND s.revoked_at IS NULL
         AND s.expires_at>clock_timestamp()
         AND s.token_digest=decode(NULLIF(current_setting('pay54.w10_token',true),''),'hex')
     )
 ));
CREATE POLICY pay54_w10_scope_entry ON pay54.ledger_entries
 AS PERMISSIVE FOR SELECT TO pay54_writer9_owner_candidate
 USING (false AND EXISTS(
   SELECT 1 FROM pay54.ledger_accounts la
   JOIN pay54.wallets w ON w.id=la.wallet_id
   JOIN pay54.auth_sessions s ON s.principal_id=w.owner_subject
   JOIN pay54.account_contexts a ON a.id=s.active_account_id
   JOIN pay54.account_memberships m ON m.account_id=a.id
       AND m.principal_subject=s.principal_id
   WHERE la.id=ledger_entries.account_id
     AND la.currency=ledger_entries.currency
     AND la.account_class='CUSTOMER_LIABILITY'
     AND a.legal_owner_subject=s.principal_id
     AND a.account_type='PERSONAL' AND a.status='ACTIVE'
     AND a.verification_status='VERIFIED'
     AND m.role='PERSONAL_OWNER' AND m.status='ACTIVE'
     AND s.session_status='ACTIVE' AND s.revoked_at IS NULL
     AND s.expires_at>clock_timestamp()
     AND s.token_digest=decode(NULLIF(current_setting('pay54.w10_token',true),''),'hex')
 ));
CREATE POLICY pay54_w10_scope_journal ON pay54.ledger_journals
 AS PERMISSIVE FOR SELECT TO pay54_writer9_owner_candidate
 USING (false AND ledger_journals.status='POSTED'
 AND EXISTS(
    SELECT 1 FROM pay54.ledger_entries e
    JOIN pay54.ledger_accounts la ON la.id=e.account_id
    JOIN pay54.wallets w ON w.id=la.wallet_id
    JOIN pay54.auth_sessions s ON s.principal_id=w.owner_subject
    JOIN pay54.account_contexts a ON a.id=s.active_account_id
    JOIN pay54.account_memberships m ON m.account_id=a.id
       AND m.principal_subject=s.principal_id
    WHERE e.journal_id=ledger_journals.id
      AND a.legal_owner_subject=s.principal_id
      AND a.account_type='PERSONAL' AND a.status='ACTIVE'
      AND a.verification_status='VERIFIED'
      AND m.role='PERSONAL_OWNER' AND m.status='ACTIVE'
      AND s.session_status='ACTIVE' AND s.revoked_at IS NULL
      AND s.expires_at>clock_timestamp()
      AND s.token_digest=decode(NULLIF(current_setting('pay54.w10_token',true),''),'hex')
 ));
CREATE POLICY pay54_w10_scope_hold ON pay54.balance_reservations
 AS PERMISSIVE FOR SELECT TO pay54_writer9_owner_candidate
 USING (false AND EXISTS(
   SELECT 1 FROM pay54.ledger_accounts la
   JOIN pay54.wallets w ON w.id=la.wallet_id
   JOIN pay54.auth_sessions s ON s.principal_id=w.owner_subject
   JOIN pay54.account_contexts a ON a.id=s.active_account_id
   JOIN pay54.account_memberships m ON m.account_id=a.id
       AND m.principal_subject=s.principal_id
   WHERE la.id=balance_reservations.account_id
     AND la.currency=balance_reservations.currency
     AND la.account_class='CUSTOMER_LIABILITY'
     AND a.legal_owner_subject=s.principal_id
     AND a.account_type='PERSONAL' AND a.status='ACTIVE'
     AND a.verification_status='VERIFIED'
     AND m.role='PERSONAL_OWNER' AND m.status='ACTIVE'
     AND s.session_status='ACTIVE' AND s.revoked_at IS NULL
     AND s.expires_at>clock_timestamp()
     AND s.token_digest=decode(NULLIF(current_setting('pay54.w10_token',true),''),'hex')
 ));

DO $verify$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM pg_policies p
 WHERE p.schemaname='pay54'
 AND p.policyname LIKE 'pay54_w10_scope_%'
 AND p.permissive='PERMISSIVE'
 AND p.cmd='SELECT'
 AND p.roles=ARRAY['pay54_writer9_owner_candidate']::name[]
 AND position('false' in p.qual)>0;
 IF n<>5 THEN RAISE EXCEPTION 'PAY54_W10_SHADOW_SCOPE_POLICY_MATRIX: %',n; END IF;
 IF has_table_privilege('pay54_writer9_owner_candidate','pay54.ledger_entries','SELECT')
 OR has_table_privilege('pay54_writer9_caller_candidate','pay54.ledger_entries','SELECT')
 OR has_function_privilege('pay54_writer9_caller_candidate',
   'pay54.reserve_wallet_transfer(uuid,uuid,uuid,bigint,text,text,timestamp with time zone)','EXECUTE')
 THEN RAISE EXCEPTION 'PAY54_W10_UNAPPROVED_FINANCIAL_GRANT'; END IF;
END $verify$;
COMMIT;
\echo PAY54_W10_SHADOW_TENANT_POLICIES_FAIL_CLOSED_PASS
