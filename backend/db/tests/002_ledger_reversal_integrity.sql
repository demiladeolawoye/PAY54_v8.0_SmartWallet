
-- ============================================================================
-- PAY54 ENTERPRISE EXACT REVERSAL INTEGRITY TESTS
-- File: backend/db/tests/002_ledger_reversal_integrity.sql
-- Version: 1.0.0
-- Work Package: WP-P54-BACKEND-001C.2
--
-- PostgreSQL 15+
-- Requires migrations 001 and 002.
--
-- Run only against a disposable PostgreSQL database.
-- Test records are rolled back. No real customer data is used.
-- ============================================================================

\set ON_ERROR_STOP on

BEGIN;

SET LOCAL statement_timeout = '30s';
SET LOCAL lock_timeout = '5s';

-- ============================================================================
-- SCHEMA AND TRIGGER CHECK
-- ============================================================================

DO $$
BEGIN
    IF to_regclass('pay54.ledger_journals') IS NULL
       OR to_regclass('pay54.ledger_entries') IS NULL
    THEN
        RAISE EXCEPTION
            'PAY54 ledger schema has not been installed';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger AS t
        JOIN pg_class AS c
          ON c.oid = t.tgrelid
        JOIN pg_namespace AS n
          ON n.oid = c.relnamespace
        WHERE n.nspname = 'pay54'
          AND c.relname = 'ledger_journals'
          AND t.tgname = 'ledger_posting_integrity'
          AND t.tgenabled = 'O'
    ) THEN
        RAISE EXCEPTION
            'PAY54 journal integrity trigger unavailable';
    END IF;

    RAISE NOTICE
        'PASS: Required ledger schema and trigger present';
END;
$$;

-- ============================================================================
-- TEST FIXTURE IDENTIFIERS
-- ============================================================================

CREATE TEMP TABLE pay54_reversal_test_ids (
    name TEXT PRIMARY KEY,
    id UUID NOT NULL
) ON COMMIT DROP;

DO $$
DECLARE
    account_a UUID;
    account_b UUID;
    account_c UUID;
    original_journal UUID;
BEGIN
    INSERT INTO pay54.ledger_accounts (
        currency,
        account_class,
        account_reference
    )
    VALUES (
        'NGN',
        'PROVIDER_CLEARING',
        'reversal-test-a-' || gen_random_uuid()::TEXT
    )
    RETURNING id INTO account_a;

    INSERT INTO pay54.ledger_accounts (
        currency,
        account_class,
        account_reference
    )
    VALUES (
        'NGN',
        'SETTLEMENT',
        'reversal-test-b-' || gen_random_uuid()::TEXT
    )
    RETURNING id INTO account_b;

    INSERT INTO pay54.ledger_accounts (
        currency,
        account_class,
        account_reference
    )
    VALUES (
        'NGN',
        'SUSPENSE',
        'reversal-test-c-' || gen_random_uuid()::TEXT
    )
    RETURNING id INTO account_c;

    INSERT INTO pay54.ledger_journals (
        journal_type
    )
    VALUES (
        'TRANSFER'
    )
    RETURNING id INTO original_journal;

    INSERT INTO pay54.ledger_entries (
        journal_id,
        account_id,
        currency,
        amount_minor
    )
    VALUES
        (original_journal, account_a, 'NGN', -500),
        (original_journal, account_b, 'NGN', 500);

    UPDATE pay54.ledger_journals
    SET status = 'POSTED',
        posted_at = now()
    WHERE id = original_journal;

    -- Force deferred integrity checks to execute now.

    SET CONSTRAINTS ALL IMMEDIATE;

    INSERT INTO pay54_reversal_test_ids
    VALUES
        ('account_a', account_a),
        ('account_b', account_b),
        ('account_c', account_c),
        ('original', original_journal);

    RAISE NOTICE
        'PASS: Original balanced journal posted';
END;
$$;

-- ============================================================================
-- HELPER FOR EXPECTED REVERSAL REJECTIONS
--
-- Each invalid posting is attempted within an exception subtransaction.
-- Its writes are rolled back if PostgreSQL rejects it.
-- ============================================================================

CREATE FUNCTION pg_temp.expect_reversal_rejected(
    test_name TEXT,
    source_journal UUID,
    account_a UUID,
    account_b UUID,
    account_c UUID,
    test_mode TEXT,
    expected_message TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    candidate UUID;
    was_rejected BOOLEAN := FALSE;
    actual_message TEXT;
    actual_state TEXT;
    journal_kind TEXT;
    original_reference UUID;
BEGIN
    BEGIN
        journal_kind := 'REVERSAL';
        original_reference := source_journal;

        IF test_mode = 'MISSING_REFERENCE' THEN
            original_reference := NULL;
        END IF;

        IF test_mode = 'WRONG_JOURNAL_TYPE' THEN
            journal_kind := 'TRANSFER';
        END IF;

        INSERT INTO pay54.ledger_journals (
            journal_type,
            reverses_journal_id
        )
        VALUES (
            journal_kind,
            original_reference
        )
        RETURNING id INTO candidate;

        IF test_mode = 'WRONG_AMOUNT' THEN
            INSERT INTO pay54.ledger_entries (
                journal_id,
                account_id,
                currency,
                amount_minor
            )
            VALUES
                (candidate, account_a, 'NGN', 400),
                (candidate, account_b, 'NGN', -400);

        ELSIF test_mode = 'WRONG_ACCOUNT' THEN
            INSERT INTO pay54.ledger_entries (
                journal_id,
                account_id,
                currency,
                amount_minor
            )
            VALUES
                (candidate, account_c, 'NGN', 500),
                (candidate, account_b, 'NGN', -500);

        ELSIF test_mode = 'SPLIT_ENTRIES' THEN
            INSERT INTO pay54.ledger_entries (
                journal_id,
                account_id,
                currency,
                amount_minor
            )
            VALUES
                (candidate, account_a, 'NGN', 250),
                (candidate, account_a, 'NGN', 250),
                (candidate, account_b, 'NGN', -250),
                (candidate, account_b, 'NGN', -250);

        ELSE
            INSERT INTO pay54.ledger_entries (
                journal_id,
                account_id,
                currency,
                amount_minor
            )
            VALUES
                (candidate, account_a, 'NGN', 500),
                (candidate, account_b, 'NGN', -500);
        END IF;

        UPDATE pay54.ledger_journals
        SET status = 'POSTED',
            posted_at = now()
        WHERE id = candidate;

        SET CONSTRAINTS ALL IMMEDIATE;

    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS
            actual_message = MESSAGE_TEXT,
            actual_state = RETURNED_SQLSTATE;

        IF POSITION(expected_message IN actual_message) = 0 THEN
            RAISE EXCEPTION
                'FAIL: % rejected unexpectedly: SQLSTATE %, %',
                test_name,
                actual_state,
                actual_message;
        END IF;

        was_rejected := TRUE;
    END;

    IF NOT was_rejected THEN
        RAISE EXCEPTION
            'FAIL: % was incorrectly accepted',
            test_name;
    END IF;

    RAISE NOTICE
        'PASS: % correctly rejected',
        test_name;
END;
$$;

-- ============================================================================
-- NEGATIVE TESTS BEFORE CONSUMING THE ORIGINAL REVERSAL REFERENCE
-- ============================================================================

DO $$
DECLARE
    original_journal UUID;
    account_a UUID;
    account_b UUID;
    account_c UUID;
    draft_journal UUID;
BEGIN
    SELECT id INTO original_journal
    FROM pay54_reversal_test_ids
    WHERE name = 'original';

    SELECT id INTO account_a
    FROM pay54_reversal_test_ids
    WHERE name = 'account_a';

    SELECT id INTO account_b
    FROM pay54_reversal_test_ids
    WHERE name = 'account_b';

    SELECT id INTO account_c
    FROM pay54_reversal_test_ids
    WHERE name = 'account_c';

    PERFORM pg_temp.expect_reversal_rejected(
        'Balanced but incorrect reversal amount',
        original_journal,
        account_a,
        account_b,
        account_c,
        'WRONG_AMOUNT',
        'do not exactly invert'
    );

    PERFORM pg_temp.expect_reversal_rejected(
        'Reversal posts against the wrong account',
        original_journal,
        account_a,
        account_b,
        account_c,
        'WRONG_ACCOUNT',
        'do not exactly invert'
    );

    PERFORM pg_temp.expect_reversal_rejected(
        'Split entries are not exact inverse entries',
        original_journal,
        account_a,
        account_b,
        account_c,
        'SPLIT_ENTRIES',
        'do not exactly invert'
    );

    PERFORM pg_temp.expect_reversal_rejected(
        'Reversal without original reference',
        original_journal,
        account_a,
        account_b,
        account_c,
        'MISSING_REFERENCE',
        'requires an original journal'
    );

    PERFORM pg_temp.expect_reversal_rejected(
        'Ordinary journal misuses a reversal reference',
        original_journal,
        account_a,
        account_b,
        account_c,
        'WRONG_JOURNAL_TYPE',
        'Only reversal journals may reference'
    );

    -- A draft journal may not be used as the original.
    -- The invalid child reversal is rolled back by the helper.

    INSERT INTO pay54.ledger_journals (
        journal_type
    )
    VALUES ('TRANSFER')
    RETURNING id INTO draft_journal;

    PERFORM pg_temp.expect_reversal_rejected(
        'Reversal of unposted journal',
        draft_journal,
        account_a,
        account_b,
        account_c,
        'DEFAULT',
        'already posted'
    );
END;
$$;

-- ============================================================================
-- POSITIVE TEST: EXACT REVERSAL
-- ============================================================================

DO $$
DECLARE
    original_journal UUID;
    account_a UUID;
    account_b UUID;
    reversal_journal UUID;
BEGIN
    SELECT id INTO original_journal
    FROM pay54_reversal_test_ids
    WHERE name = 'original';

    SELECT id INTO account_a
    FROM pay54_reversal_test_ids
    WHERE name = 'account_a';

    SELECT id INTO account_b
    FROM pay54_reversal_test_ids
    WHERE name = 'account_b';

    INSERT INTO pay54.ledger_journals (
        journal_type,
        reverses_journal_id
    )
    VALUES (
        'REVERSAL',
        original_journal
    )
    RETURNING id INTO reversal_journal;

    INSERT INTO pay54.ledger_entries (
        journal_id,
        account_id,
        currency,
        amount_minor
    )
    VALUES
        (reversal_journal, account_a, 'NGN', 500),
        (reversal_journal, account_b, 'NGN', -500);

    UPDATE pay54.ledger_journals
    SET status = 'POSTED',
        posted_at = now()
    WHERE id = reversal_journal;

    SET CONSTRAINTS ALL IMMEDIATE;

    IF NOT EXISTS (
        SELECT 1
        FROM pay54.ledger_journals
        WHERE id = reversal_journal
          AND status = 'POSTED'
          AND reverses_journal_id = original_journal
    ) THEN
        RAISE EXCEPTION
            'FAIL: Valid exact reversal did not post';
    END IF;

    INSERT INTO pay54_reversal_test_ids
    VALUES ('valid_reversal', reversal_journal);

    RAISE NOTICE
        'PASS: Exact reversal successfully posted';
END;
$$;

-- ============================================================================
-- DUPLICATE AND REVERSAL-OF-REVERSAL TESTS
-- ============================================================================

DO $$
DECLARE
    original_journal UUID;
    valid_reversal UUID;
    account_a UUID;
    account_b UUID;
    account_c UUID;
BEGIN
    SELECT id INTO original_journal
    FROM pay54_reversal_test_ids
    WHERE name = 'original';

    SELECT id INTO valid_reversal
    FROM pay54_reversal_test_ids
    WHERE name = 'valid_reversal';

    SELECT id INTO account_a
    FROM pay54_reversal_test_ids
    WHERE name = 'account_a';

    SELECT id INTO account_b
    FROM pay54_reversal_test_ids
    WHERE name = 'account_b';

    SELECT id INTO account_c
    FROM pay54_reversal_test_ids
    WHERE name = 'account_c';

    PERFORM pg_temp.expect_reversal_rejected(
        'Duplicate full reversal',
        original_journal,
        account_a,
        account_b,
        account_c,
        'DEFAULT',
        'duplicate key value violates unique constraint'
    );

    PERFORM pg_temp.expect_reversal_rejected(
        'Reversal of another reversal',
        valid_reversal,
        account_a,
        account_b,
        account_c,
        'DEFAULT',
        'cannot reverse another reversal'
    );
END;
$$;

-- ============================================================================
-- PUBLIC PRIVILEGE AUDIT
--
-- Object-owner permissions are intentionally not tested here.
-- Runtime role isolation requires a separate integration environment.
-- ============================================================================

DO $$
DECLARE
    public_schema_permissions BIGINT;
    public_table_permissions BIGINT;
    public_function_permissions BIGINT;
BEGIN
    SELECT COUNT(*)
    INTO public_schema_permissions
    FROM pg_namespace AS n
    CROSS JOIN LATERAL aclexplode(
        COALESCE(
            n.nspacl,
            acldefault('n', n.nspowner)
        )
    ) AS acl
    WHERE n.nspname = 'pay54'
      AND acl.grantee = 0;

    IF public_schema_permissions <> 0 THEN
        RAISE EXCEPTION
            'FAIL: PUBLIC retains PAY54 schema privileges';
    END IF;

    SELECT COUNT(*)
    INTO public_table_permissions
    FROM pg_class AS c
    JOIN pg_namespace AS n
      ON n.oid = c.relnamespace
    CROSS JOIN LATERAL aclexplode(
        COALESCE(
            c.relacl,
            acldefault('r', c.relowner)
        )
    ) AS acl
    WHERE n.nspname = 'pay54'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
      AND acl.grantee = 0;

    IF public_table_permissions <> 0 THEN
        RAISE EXCEPTION
            'FAIL: PUBLIC retains PAY54 relation privileges';
    END IF;

    SELECT COUNT(*)
    INTO public_function_permissions
    FROM pg_proc AS p
    JOIN pg_namespace AS n
      ON n.oid = p.pronamespace
    CROSS JOIN LATERAL aclexplode(
        COALESCE(
            p.proacl,
            acldefault('f', p.proowner)
        )
    ) AS acl
    WHERE n.nspname = 'pay54'
      AND acl.grantee = 0
      AND acl.privilege_type = 'EXECUTE';

    IF public_function_permissions <> 0 THEN
        RAISE EXCEPTION
            'FAIL: PUBLIC retains PAY54 function execution privileges';
    END IF;

    RAISE NOTICE
        'PASS: PAY54 financial schema PUBLIC privileges restricted';
END;
$$;

DO $$
BEGIN
    RAISE NOTICE
        'PAY54 REVERSAL INTEGRITY TEST SUITE COMPLETE';

    RAISE NOTICE
        'Exact reversals accepted; invalid reversals rejected';

    RAISE NOTICE
        'All synthetic records will be rolled back';
END;
$$;

ROLLBACK;
