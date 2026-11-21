-- PAY54 PR60 restricted role / actual SECURITY DEFINER proof.
-- Disposable PG16 only. No customer or production activation.
\set ON_ERROR_STOP on

-- The callable role must not have direct table or invoker writer privileges.
BEGIN;
DO $verify$
DECLARE v_owner oid; v_caller oid; v_fn oid;
BEGIN
 SELECT oid INTO v_owner FROM pg_roles WHERE rolname='pay54_paytag_function_owner_role';
 SELECT oid INTO v_caller FROM pg_roles WHERE rolname='pay54_paytag_register_role';
 v_fn:=to_regprocedure(
  'pay54.register_paytag_restricted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)');
 IF v_owner IS NULL OR v_caller IS NULL OR v_fn IS NULL
 OR EXISTS(SELECT 1 FROM pg_auth_members
   WHERE roleid IN (v_owner,v_caller) OR member IN (v_owner,v_caller))
 OR NOT EXISTS(SELECT 1 FROM pg_proc WHERE oid=v_fn AND prosecdef AND proowner=v_owner)
 OR NOT has_function_privilege('pay54_paytag_register_role',v_fn,'EXECUTE')
 OR has_function_privilege('pay54_paytag_register_role',
  'pay54.register_paytag_trusted(bytea,bytea,uuid,bigint,uuid,uuid,text,bytea,bytea,uuid,uuid)','EXECUTE')
 OR has_table_privilege('pay54_paytag_register_role','pay54.auth_sessions','SELECT')
 OR has_table_privilege('pay54_paytag_register_role','pay54.paytag_registry','INSERT')
 OR has_table_privilege('pay54_paytag_register_role','pay54.ledger_entries','INSERT')
 THEN RAISE EXCEPTION 'PR60_RESTRICTED_CALLER_POSTURE_FAILURE'; END IF;
END
$verify$;
ROLLBACK;

BEGIN ISOLATION LEVEL SERIALIZABLE;
INSERT INTO pay54.auth_sessions(
 session_id,principal_id,token_digest,csrf_digest,active_account_id,
 session_status,session_version,issued_at,expires_at)
VALUES('f1600000-0000-4000-8000-000000000001',
 '22222222-2222-4222-8222-222222222222',
 decode(repeat('d1',32),'hex'),decode(repeat('d2',32),'hex'),
 '22222222-2222-4222-8222-222222222222',
 'ACTIVE',1,clock_timestamp()-interval '1 minute',
 clock_timestamp()+interval '1 hour');
SET LOCAL ROLE pay54_paytag_register_role;
DO $restricted$
DECLARE t uuid;rid uuid;re boolean; denied boolean:=FALSE;
BEGIN
 BEGIN
  PERFORM 1 FROM pay54.auth_sessions LIMIT 1;
 EXCEPTION WHEN insufficient_privilege THEN denied:=TRUE;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PR60_DIRECT_SESSION_READ_ALLOWED'; END IF;
 denied:=FALSE;
 BEGIN
  PERFORM 1 FROM pay54.paytag_registry LIMIT 1;
 EXCEPTION WHEN insufficient_privilege THEN denied:=TRUE;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PR60_DIRECT_REGISTRY_READ_ALLOWED'; END IF;

 SELECT w.tag_id,w.request_id,w.replayed INTO t,rid,re
 FROM pay54.register_paytag_restricted(
  decode(repeat('d1',32),'hex'),decode(repeat('d2',32),'hex'),
  'f1600000-0000-4000-8000-000000000001',1,
  '22222222-2222-4222-8222-222222222222',
  '22222222-2222-4222-8222-222222222222',
  'pr60_restricted_claim',decode(repeat('d3',32),'hex'),
  decode(repeat('d4',32),'hex'),
  'f1600000-0000-4000-8000-000000000002',
  'f1600000-0000-4000-8000-000000000003') w;
 IF t IS NULL OR rid IS DISTINCT FROM
  'f1600000-0000-4000-8000-000000000002'::uuid OR re IS DISTINCT FROM FALSE
 THEN RAISE EXCEPTION 'PR60_FIRST_RESTRICTED_CLAIM_FAILED'; END IF;

 SELECT w.replayed INTO re FROM pay54.register_paytag_restricted(
  decode(repeat('d1',32),'hex'),decode(repeat('d2',32),'hex'),
  'f1600000-0000-4000-8000-000000000001',1,
  '22222222-2222-4222-8222-222222222222',
  '22222222-2222-4222-8222-222222222222',
  'pr60_restricted_claim',decode(repeat('d3',32),'hex'),
  decode(repeat('d4',32),'hex'),
  'f1600000-0000-4000-8000-000000000004',
  'f1600000-0000-4000-8000-000000000005') w;
 IF re IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'PR60_RESTRICTED_REPLAY_FAILED'; END IF;

 denied:=FALSE;
 BEGIN
  PERFORM * FROM pay54.register_paytag_restricted(
   decode(repeat('d1',32),'hex'),decode(repeat('ff',32),'hex'),
   'f1600000-0000-4000-8000-000000000001',1,
   '22222222-2222-4222-8222-222222222222',
   '22222222-2222-4222-8222-222222222222',
   'pr60_restricted_claim',decode(repeat('d3',32),'hex'),
   decode(repeat('d4',32),'hex'),
   'f1600000-0000-4000-8000-000000000006',
   'f1600000-0000-4000-8000-000000000007');
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='PAY54_PAYTAG_REGISTRATION_DENIED' THEN denied:=TRUE; ELSE RAISE; END IF;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PR60_BAD_CSRF_ALLOWED'; END IF;

 denied:=FALSE;
 BEGIN
  PERFORM * FROM pay54.register_paytag_restricted(
   decode(repeat('d1',32),'hex'),decode(repeat('d2',32),'hex'),
   'f1600000-0000-4000-8000-000000000001',1,
   '11111111-1111-4111-8111-111111111111',
   '22222222-2222-4222-8222-222222222222',
   'pr60_restricted_claim',decode(repeat('d3',32),'hex'),
   decode(repeat('d4',32),'hex'),
   'f1600000-0000-4000-8000-000000000008',
   'f1600000-0000-4000-8000-000000000009');
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='PAY54_PAYTAG_REGISTRATION_DENIED' THEN denied:=TRUE; ELSE RAISE; END IF;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PR60_CROSS_ACTOR_ALLOWED'; END IF;
END
$restricted$;
RESET ROLE;

DO $verify$
BEGIN
 IF (SELECT count(*) FROM pay54.paytag_registry
    WHERE canonical_alias='pr60_restricted_claim')<>1
 OR (SELECT count(*) FROM pay54.paytag_registration_requests
    WHERE canonical_alias='pr60_restricted_claim' AND request_state='COMMITTED')<>1
 OR (SELECT count(*) FROM pay54.paytag_registry_audit a
    JOIN pay54.paytag_registry r ON r.tag_id=a.tag_id
    WHERE r.canonical_alias='pr60_restricted_claim' AND a.event_kind='CLAIMED')<>1
 THEN RAISE EXCEPTION 'PR60_RESTRICTED_ATOMIC_AUDIT_FAILURE'; END IF;
END
$verify$;
ROLLBACK;

-- Recheck invalidated session under the actual caller role.
BEGIN ISOLATION LEVEL SERIALIZABLE;
INSERT INTO pay54.auth_sessions(
 session_id,principal_id,token_digest,csrf_digest,active_account_id,
 session_status,session_version,issued_at,expires_at,revoked_at)
VALUES('f1600000-0000-4000-8000-000000000011',
 '22222222-2222-4222-8222-222222222222',
 decode(repeat('e1',32),'hex'),decode(repeat('e2',32),'hex'),
 '22222222-2222-4222-8222-222222222222',
 'REVOKED',2,clock_timestamp()-interval '1 minute',
 clock_timestamp()+interval '1 hour',clock_timestamp());
SET LOCAL ROLE pay54_paytag_register_role;
DO $revoked$
DECLARE denied boolean:=FALSE;
BEGIN
 BEGIN
  PERFORM * FROM pay54.register_paytag_restricted(
   decode(repeat('e1',32),'hex'),decode(repeat('e2',32),'hex'),
   'f1600000-0000-4000-8000-000000000011',2,
   '22222222-2222-4222-8222-222222222222',
   '22222222-2222-4222-8222-222222222222',
   'pr60_revoked_claim',decode(repeat('e3',32),'hex'),
   decode(repeat('e4',32),'hex'),
   'f1600000-0000-4000-8000-000000000012',
   'f1600000-0000-4000-8000-000000000013');
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='PAY54_PAYTAG_REGISTRATION_DENIED' THEN denied:=TRUE; ELSE RAISE; END IF;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PR60_REVOKED_SESSION_ALLOWED'; END IF;
END
$revoked$;
ROLLBACK;

-- SECURITY DEFINER cannot be invoked outside SERIALIZABLE.
BEGIN;
SET LOCAL ROLE pay54_paytag_register_role;
DO $isolation$
DECLARE denied boolean:=FALSE;
BEGIN
 BEGIN
  PERFORM * FROM pay54.register_paytag_restricted(
   decode(repeat('f1',32),'hex'),decode(repeat('f2',32),'hex'),
   'f1600000-0000-4000-8000-000000000001',1,
   '22222222-2222-4222-8222-222222222222',
   '22222222-2222-4222-8222-222222222222',
   'pr60_isolation',decode(repeat('f3',32),'hex'),
   decode(repeat('f4',32),'hex'),
   'f1600000-0000-4000-8000-000000000022',
   'f1600000-0000-4000-8000-000000000023');
 EXCEPTION WHEN raise_exception THEN
  IF SQLERRM='PAY54_PAYTAG_SERIALIZABLE_REQUIRED' THEN denied:=TRUE; ELSE RAISE; END IF;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'PR60_WEAK_ISOLATION_ALLOWED'; END IF;
END
$isolation$;
ROLLBACK;
