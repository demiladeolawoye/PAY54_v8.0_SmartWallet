-- PAY54 Batch 24 / 933 — first Personal/Business account binding.
-- Additive after migrations 001–019; never changes the canonical schema.
-- Restricted SECURITY DEFINER belongs to the already-reviewed session
-- rotation executor, while caller has EXECUTE only. No new database role,
-- role membership, cloud IAM or customer-facing endpoint.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
DO $$
BEGIN
 IF to_regclass('pay54.identity_assertion_receipts') IS NULL
    OR to_regprocedure(
      'pay54.rotate_account_context_session(bytea,bytea,uuid,bytea,bytea,uuid,bigint,uuid,uuid,timestamptz)'
    ) IS NULL
    OR NOT EXISTS(SELECT 1 FROM pg_roles
      WHERE rolname='pay54_session_rotate_executor_role'
        AND NOT rolcanlogin AND NOT rolbypassrls)
 THEN RAISE EXCEPTION 'PAY54_CANONICAL_BOOTSTRAP_AND_ROTATION_REQUIRED'; END IF;
 IF to_regprocedure(
   'pay54.bind_initial_account_session(bytea,bytea,uuid,bytea,bytea,uuid,bigint,uuid,uuid,timestamptz)'
 ) IS NOT NULL
 THEN RAISE EXCEPTION 'PAY54_INITIAL_BINDING_MIGRATION_CONFLICT'; END IF;
END $$;

CREATE FUNCTION pay54.bind_initial_account_session(
 p_existing_digest bytea,
 p_csrf_digest bytea,
 p_new_session_id uuid,
 p_new_token_digest bytea,
 p_new_csrf_digest bytea,
 p_requested_account_id uuid,
 p_expected_version bigint,
 p_correlation_id uuid,
 p_audit_id uuid,
 p_new_expires_at timestamptz
) RETURNS TABLE(bound_session_id uuid,bound_session_version bigint)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,pay54
AS $$
DECLARE
 s pay54.auth_sessions%ROWTYPE;
 permitted boolean;
BEGIN
 IF p_existing_digest IS NULL OR octet_length(p_existing_digest)<>32
    OR p_csrf_digest IS NULL OR octet_length(p_csrf_digest)<>32
    OR p_new_token_digest IS NULL OR octet_length(p_new_token_digest)<>32
    OR p_new_csrf_digest IS NULL OR octet_length(p_new_csrf_digest)<>32
    OR p_new_token_digest=p_existing_digest
    OR p_new_csrf_digest=p_csrf_digest
    OR p_new_token_digest=p_new_csrf_digest
    OR p_new_session_id IS NULL OR p_requested_account_id IS NULL
    OR p_correlation_id IS NULL OR p_audit_id IS NULL
    OR p_expected_version IS NULL OR p_expected_version<1
    OR p_expected_version>=9223372036854775807
    OR p_new_expires_at IS NULL
 THEN RAISE EXCEPTION 'PAY54_INITIAL_ACCOUNT_BINDING_DENIED'
   USING ERRCODE='P0001'; END IF;

 PERFORM set_config('pay54.session_digest',
   encode(p_existing_digest,'hex'),true);
 SELECT * INTO s
  FROM pay54.auth_sessions
  WHERE token_digest=p_existing_digest
    AND session_status='ACTIVE'
    AND session_version=p_expected_version
    AND active_account_id IS NULL
    AND expires_at>clock_timestamp()
  FOR UPDATE;
 IF NOT FOUND OR s.session_id=p_new_session_id
    OR s.csrf_digest<>p_csrf_digest
    OR p_new_expires_at<=clock_timestamp()
    OR p_new_expires_at>s.expires_at
 THEN RAISE EXCEPTION 'PAY54_INITIAL_ACCOUNT_BINDING_DENIED'
  USING ERRCODE='P0001'; END IF;

 PERFORM set_config('pay54.actor_id',s.principal_id::text,true);
 SELECT EXISTS(
  SELECT 1 FROM pay54.account_contexts a
   JOIN pay54.account_memberships m ON m.account_id=a.id
   WHERE a.id=p_requested_account_id
     AND m.principal_subject=s.principal_id
     AND a.status='ACTIVE' AND a.verification_status='VERIFIED'
     AND m.status='ACTIVE'
     AND (a.account_type='BUSINESS' OR
       (a.account_type='PERSONAL'
        AND a.legal_owner_subject=s.principal_id
        AND m.role='PERSONAL_OWNER'))
 ) INTO permitted;
 IF NOT permitted THEN
  RAISE EXCEPTION 'PAY54_INITIAL_ACCOUNT_BINDING_DENIED'
   USING ERRCODE='P0001'; END IF;

 UPDATE pay54.auth_sessions
  SET session_status='REVOKED',revoked_at=clock_timestamp()
  WHERE session_id=s.session_id;
 INSERT INTO pay54.auth_sessions(
   session_id,principal_id,token_digest,csrf_digest,active_account_id,
   session_status,session_version,issued_at,expires_at
 ) VALUES(
   p_new_session_id,s.principal_id,p_new_token_digest,p_new_csrf_digest,
   p_requested_account_id,'ACTIVE',s.session_version+1,
   clock_timestamp(),p_new_expires_at
 );
 INSERT INTO pay54.account_context_audit(
   audit_id,principal_id,previous_account_id,next_account_id,
   previous_session_id,next_session_id,
   expected_previous_version,next_session_version,correlation_id
 ) VALUES (
   p_audit_id,s.principal_id,NULL,p_requested_account_id,
   s.session_id,p_new_session_id,
   s.session_version,s.session_version+1,p_correlation_id
 );
 RETURN QUERY SELECT p_new_session_id,s.session_version+1;
END $$;

GRANT CREATE ON SCHEMA pay54 TO pay54_session_rotate_executor_role;
ALTER FUNCTION pay54.bind_initial_account_session(
 bytea,bytea,uuid,bytea,bytea,uuid,bigint,uuid,uuid,timestamptz
) OWNER TO pay54_session_rotate_executor_role;
REVOKE CREATE ON SCHEMA pay54 FROM pay54_session_rotate_executor_role;
REVOKE ALL ON FUNCTION pay54.bind_initial_account_session(
 bytea,bytea,uuid,bytea,bytea,uuid,bigint,uuid,uuid,timestamptz
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pay54.bind_initial_account_session(
 bytea,bytea,uuid,bytea,bytea,uuid,bigint,uuid,uuid,timestamptz
) TO pay54_session_rotate_role;
COMMIT;
