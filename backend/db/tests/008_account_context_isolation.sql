-- PAY54 account-context isolation regression — disposable PostgreSQL CI only.
-- Migrations 001 through 008 are required. All synthetic records are rolled back.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

DO $$
DECLARE
    v_person UUID := '11111111-1111-4111-8111-111111111111';
    v_other UUID := '66666666-6666-4666-8666-666666666666';
    v_personal UUID := '22222222-2222-4222-8222-222222222222';
    v_business UUID := '33333333-3333-4333-8333-333333333333';
BEGIN
    IF NOT (
      SELECT relrowsecurity AND relforcerowsecurity FROM pg_class
      WHERE oid = 'pay54.account_contexts'::regclass
    ) OR NOT (
      SELECT relrowsecurity AND relforcerowsecurity FROM pg_class
      WHERE oid = 'pay54.account_memberships'::regclass
    ) THEN
        RAISE EXCEPTION 'RLS must be enabled and forced for both account tables';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_roles r
        WHERE r.rolname IN (
          'pay54_financial_app_role',
          'pay54_financial_audit_role',
          'pay54_ledger_executor_role'
        )
        AND (
          has_table_privilege(r.rolname, 'pay54.account_contexts', 'SELECT')
          OR has_table_privilege(r.rolname, 'pay54.account_contexts', 'INSERT')
          OR has_table_privilege(r.rolname, 'pay54.account_contexts', 'UPDATE')
          OR has_table_privilege(r.rolname, 'pay54.account_contexts', 'DELETE')
          OR has_table_privilege(r.rolname, 'pay54.account_memberships', 'SELECT')
          OR has_table_privilege(r.rolname, 'pay54.account_memberships', 'INSERT')
          OR has_table_privilege(r.rolname, 'pay54.account_memberships', 'UPDATE')
          OR has_table_privilege(r.rolname, 'pay54.account_memberships', 'DELETE')
        )
    ) THEN
        RAISE EXCEPTION 'Restricted financial roles gained account-context access';
    END IF;

    INSERT INTO pay54.account_contexts
      (id, legal_owner_subject, account_type, display_name, status, verification_status)
    VALUES
      (v_personal, v_person, 'PERSONAL', 'Personal account', 'ACTIVE', 'VERIFIED'),
      (v_business, v_person, 'BUSINESS', 'Approved business', 'ACTIVE', 'VERIFIED');

    INSERT INTO pay54.account_memberships
      (account_id, principal_subject, role, status)
    VALUES
      (v_personal, v_person, 'PERSONAL_OWNER', 'ACTIVE'),
      (v_business, v_person, 'BUSINESS_OWNER', 'ACTIVE');

    -- A personal account cannot be delegated to a different principal,
    -- and no business account can carry a PERSONAL_OWNER role.
    BEGIN
      INSERT INTO pay54.account_memberships
        (account_id, principal_subject, role, status)
      VALUES (v_personal, v_other, 'BUSINESS_VIEWER', 'ACTIVE');
      RAISE EXCEPTION 'UNSAFE_PERSONAL_MEMBERSHIP_ACCEPTED';
    EXCEPTION
      WHEN raise_exception THEN
        IF SQLERRM = 'UNSAFE_PERSONAL_MEMBERSHIP_ACCEPTED' THEN RAISE; END IF;
    END;

    BEGIN
      INSERT INTO pay54.account_memberships
        (account_id, principal_subject, role, status)
      VALUES (v_business, v_other, 'PERSONAL_OWNER', 'ACTIVE');
      RAISE EXCEPTION 'UNSAFE_BUSINESS_MEMBERSHIP_ACCEPTED';
    EXCEPTION
      WHEN raise_exception THEN
        IF SQLERRM = 'UNSAFE_BUSINESS_MEMBERSHIP_ACCEPTED' THEN RAISE; END IF;
    END;

    BEGIN
      UPDATE pay54.account_contexts SET legal_owner_subject = v_other
      WHERE id = v_personal;
      RAISE EXCEPTION 'UNSAFE_OWNER_REASSIGNMENT_ACCEPTED';
    EXCEPTION
      WHEN raise_exception THEN
        IF SQLERRM = 'UNSAFE_OWNER_REASSIGNMENT_ACCEPTED' THEN RAISE; END IF;
    END;

    BEGIN
      UPDATE pay54.account_contexts SET account_type = 'PERSONAL'
      WHERE id = v_business;
      RAISE EXCEPTION 'UNSAFE_BUSINESS_TYPE_REASSIGNMENT_ACCEPTED';
    EXCEPTION
      WHEN raise_exception THEN
        IF SQLERRM = 'UNSAFE_BUSINESS_TYPE_REASSIGNMENT_ACCEPTED' THEN RAISE; END IF;
    END;

    BEGIN
      INSERT INTO pay54.account_contexts
        (legal_owner_subject, account_type, display_name, status, verification_status)
      VALUES (v_other, 'BUSINESS', 'Unverified', 'ACTIVE', 'NOT_VERIFIED');
      RAISE EXCEPTION 'UNVERIFIED_ACCOUNT_ACTIVATED';
    EXCEPTION
      WHEN check_violation THEN NULL;
      WHEN raise_exception THEN
        IF SQLERRM = 'UNVERIFIED_ACCOUNT_ACTIVATED' THEN RAISE; END IF;
    END;

    IF (SELECT COUNT(*) FROM pay54.account_contexts) <> 2
        OR (SELECT COUNT(*) FROM pay54.account_memberships) <> 2 THEN
        RAISE EXCEPTION 'Unexpected account-context rows';
    END IF;

    IF EXISTS (SELECT 1 FROM pay54.wallets)
       OR EXISTS (SELECT 1 FROM pay54.financial_operations)
       OR EXISTS (SELECT 1 FROM pay54.ledger_entries)
       OR EXISTS (SELECT 1 FROM pay54.balance_reservations)
    THEN
        RAISE EXCEPTION 'Account-context test altered financial data';
    END IF;

    RAISE NOTICE 'PASS: isolated account contexts, owner binding, verification gate and restricted grants';
END;
$$;

ROLLBACK;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pay54.account_contexts)
     OR EXISTS (SELECT 1 FROM pay54.account_memberships)
  THEN
    RAISE EXCEPTION 'Synthetic account-context rows persisted outside transaction';
  END IF;
  RAISE NOTICE 'PASS: Account-context test records rolled back';
END;
$$;
