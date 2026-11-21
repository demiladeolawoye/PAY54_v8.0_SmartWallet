-- PAY54 CR-PAYTAG-01 / 028 — restricted registration execution (SOURCE ONLY).
-- Not approved for production deployment or runtime provisioning.
-- Requires reviewed 001–027, independent security approval and disposable PG16.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';

DO $preflight$
DECLARE v_owner oid; v_caller oid;
BEGIN
 SELECT oid INTO v_owner FROM pg_roles WHERE rolname='pay54_paytag_function_owner_role'
   AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolinherit;
 SELECT oid INTO v_caller FROM pg_roles WHERE rolname='pay54_paytag_register_role'
   AND NOT rolcanlogin AND NOT rolsuper AND NOT rolbypassrls AND NOT rolinherit;
 IF v_owner IS NULL OR v_caller IS NULL OR v_owner=v_caller
 OR EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid IN (v_owner,v_caller)
                                       OR member IN (v_owner,v_caller))
 OR to_regprocedure('pay54.register_paytag_restricted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)') IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=to_regprocedure(
  'pay54.register_paytag_trusted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)')
  AND NOT prosecdef)
 THEN RAISE EXCEPTION 'PAY54_PAYTAG_RESTRICTED_AUTHORITY_PRECONDITION_DENIED'
   USING ERRCODE='P0001'; END IF;
END
$preflight$;

-- Restrict the internal writer to this non-login owner only. The owner is
-- not a member of the callable role; no connection identities are created.
GRANT USAGE ON SCHEMA pay54 TO pay54_paytag_function_owner_role;
GRANT USAGE ON SCHEMA pay54 TO pay54_paytag_register_role;
GRANT EXECUTE ON FUNCTION pay54.register_paytag_trusted(
 bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid
) TO pay54_paytag_function_owner_role;

-- Locking reads require UPDATE privilege in PostgreSQL; these grants are
-- exclusive to the owner, NEVER to the calling role or financial app.
GRANT SELECT ON pay54.auth_sessions, pay54.account_contexts,
 pay54.account_memberships, pay54.wallets, pay54.personal_wallet_bindings,
 pay54.paytag_registration_requests, pay54.paytag_registry,
 pay54.paytag_registry_audit
TO pay54_paytag_function_owner_role;

GRANT UPDATE (revoked_at) ON pay54.auth_sessions
 TO pay54_paytag_function_owner_role;
GRANT UPDATE (status) ON pay54.account_contexts,
 pay54.account_memberships, pay54.wallets
 TO pay54_paytag_function_owner_role;
GRANT UPDATE (bound_at) ON pay54.personal_wallet_bindings
 TO pay54_paytag_function_owner_role;
GRANT INSERT ON pay54.paytag_registry, pay54.paytag_registry_audit,
 pay54.paytag_registration_requests TO pay54_paytag_function_owner_role;
GRANT UPDATE (request_state,registry_tag_id,committed_at)
 ON pay54.paytag_registration_requests TO pay54_paytag_function_owner_role;

-- Enforced RLS applies even though the table owner is the migration role.
-- Status predicates provide defence in depth; precise owner-account locking,
-- token/CSRF binding and alias integrity are enforced by the trusted writer.
CREATE POLICY pay54_paytag_owner_session_read
 ON pay54.auth_sessions FOR SELECT TO pay54_paytag_function_owner_role
 USING (session_status='ACTIVE' AND revoked_at IS NULL
        AND issued_at<=clock_timestamp() AND expires_at>clock_timestamp());
CREATE POLICY pay54_paytag_owner_session_lock
 ON pay54.auth_sessions FOR UPDATE TO pay54_paytag_function_owner_role
 USING (session_status='ACTIVE' AND revoked_at IS NULL
        AND issued_at<=clock_timestamp() AND expires_at>clock_timestamp())
 WITH CHECK (true);
CREATE POLICY pay54_paytag_owner_account_read
 ON pay54.account_contexts FOR SELECT TO pay54_paytag_function_owner_role
 USING (account_type='PERSONAL' AND status='ACTIVE'
        AND verification_status='VERIFIED');
CREATE POLICY pay54_paytag_owner_account_lock
 ON pay54.account_contexts FOR UPDATE TO pay54_paytag_function_owner_role
 USING (account_type='PERSONAL' AND status='ACTIVE'
        AND verification_status='VERIFIED') WITH CHECK (true);
CREATE POLICY pay54_paytag_owner_membership_read
 ON pay54.account_memberships FOR SELECT TO pay54_paytag_function_owner_role
 USING (role='PERSONAL_OWNER' AND status='ACTIVE');
CREATE POLICY pay54_paytag_owner_membership_lock
 ON pay54.account_memberships FOR UPDATE TO pay54_paytag_function_owner_role
 USING (role='PERSONAL_OWNER' AND status='ACTIVE') WITH CHECK (true);
CREATE POLICY pay54_paytag_owner_wallet_read
 ON pay54.wallets FOR SELECT TO pay54_paytag_function_owner_role
 USING (status='ACTIVE');
CREATE POLICY pay54_paytag_owner_wallet_lock
 ON pay54.wallets FOR UPDATE TO pay54_paytag_function_owner_role
 USING (status='ACTIVE') WITH CHECK (true);
CREATE POLICY pay54_paytag_owner_binding_read
 ON pay54.personal_wallet_bindings FOR SELECT TO pay54_paytag_function_owner_role
 USING (true);
CREATE POLICY pay54_paytag_owner_binding_lock
 ON pay54.personal_wallet_bindings FOR UPDATE TO pay54_paytag_function_owner_role
 USING (true) WITH CHECK (true);
CREATE POLICY pay54_paytag_owner_request_read
 ON pay54.paytag_registration_requests FOR SELECT TO pay54_paytag_function_owner_role
 USING (true);
CREATE POLICY pay54_paytag_owner_request_insert
 ON pay54.paytag_registration_requests FOR INSERT TO pay54_paytag_function_owner_role
 WITH CHECK (true);
CREATE POLICY pay54_paytag_owner_request_update
 ON pay54.paytag_registration_requests FOR UPDATE TO pay54_paytag_function_owner_role
 USING (true) WITH CHECK (true);
CREATE POLICY pay54_paytag_owner_registry_read
 ON pay54.paytag_registry FOR SELECT TO pay54_paytag_function_owner_role
 USING (true);
CREATE POLICY pay54_paytag_owner_registry_insert
 ON pay54.paytag_registry FOR INSERT TO pay54_paytag_function_owner_role
 WITH CHECK (true);
CREATE POLICY pay54_paytag_owner_audit_read
 ON pay54.paytag_registry_audit FOR SELECT TO pay54_paytag_function_owner_role
 USING (true);
CREATE POLICY pay54_paytag_owner_audit_insert
 ON pay54.paytag_registry_audit FOR INSERT TO pay54_paytag_function_owner_role
 WITH CHECK (true);

-- The external entrypoint is owned by a dedicated non-login, non-bypass role.
-- The caller has no direct DML and no direct EXECUTE on the invoker writer.
CREATE FUNCTION pay54.register_paytag_restricted(
 p_token_digest bytea, p_csrf_digest bytea, p_session_id uuid,
 p_expected_version bigint, p_principal_id uuid, p_account_id uuid,
 p_alias text, p_key_digest bytea, p_request_digest bytea,
 p_request_id uuid, p_correlation_id uuid
) RETURNS TABLE(tag_id uuid,request_id uuid,replayed boolean)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pay54,pg_temp
AS $function$
BEGIN
 IF current_setting('transaction_isolation')<>'serializable'
    OR current_setting('transaction_read_only')<>'off'
 THEN RAISE EXCEPTION 'PAY54_PAYTAG_SERIALIZABLE_REQUIRED'
      USING ERRCODE='P0001'; END IF;
 RETURN QUERY SELECT w.tag_id,w.request_id,w.replayed
 FROM pay54.register_paytag_trusted(
 p_token_digest,p_csrf_digest,p_session_id,p_expected_version,
 p_principal_id,p_account_id,p_alias,p_key_digest,p_request_digest,
 p_request_id,p_correlation_id
 ) AS w;
END;
$function$;
REVOKE ALL ON FUNCTION pay54.register_paytag_restricted(
 bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid
) FROM PUBLIC;
ALTER FUNCTION pay54.register_paytag_restricted(
 bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid
) OWNER TO pay54_paytag_function_owner_role;
GRANT EXECUTE ON FUNCTION pay54.register_paytag_restricted(
 bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid
) TO pay54_paytag_register_role;

-- Both roles remain disjoint; the caller has no table grant or ledger grant.
DO $assert$
DECLARE v_owner oid;v_caller oid;
BEGIN
 SELECT oid INTO v_owner FROM pg_roles WHERE rolname='pay54_paytag_function_owner_role';
 SELECT oid INTO v_caller FROM pg_roles WHERE rolname='pay54_paytag_register_role';
 IF EXISTS(SELECT 1 FROM pg_auth_members WHERE roleid IN (v_owner,v_caller)
                                    OR member IN (v_owner,v_caller))
 OR EXISTS(
   SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname='pay54' AND c.relkind IN ('r','p','v','m','f')
    AND (has_table_privilege('pay54_paytag_register_role',c.oid,'SELECT')
      OR has_table_privilege('pay54_paytag_register_role',c.oid,'INSERT')
      OR has_table_privilege('pay54_paytag_register_role',c.oid,'UPDATE')
      OR has_table_privilege('pay54_paytag_register_role',c.oid,'DELETE'))
 )
 OR has_function_privilege('pay54_paytag_register_role',
 'pay54.register_paytag_trusted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)',
 'EXECUTE')
 OR has_table_privilege('pay54_paytag_function_owner_role',
 'pay54.ledger_entries','INSERT')
 OR EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='pay54' AND c.relname IN (
             'auth_sessions','account_contexts','account_memberships','wallets',
             'personal_wallet_bindings','paytag_registry','paytag_registry_audit',
             'paytag_registration_requests')
           AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity))
 THEN RAISE EXCEPTION 'PAY54_PAYTAG_RESTRICTED_EXECUTION_POSTURE_DENIED'
 USING ERRCODE='P0001'; END IF;
END
$assert$;
COMMIT;
