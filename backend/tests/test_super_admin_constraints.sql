
BEGIN;

DO $$
DECLARE
    duplicate_rejected BOOLEAN := FALSE;
    resident_rejected BOOLEAN := FALSE;
BEGIN
    -- Test 1: A second Super Admin must be rejected.
    BEGIN
        UPDATE public.users
        SET is_super_admin = TRUE
        WHERE id = '00000000-0000-4000-8000-000000000002';

        RAISE EXCEPTION 'FAIL: A second Super Admin was accepted.';
    EXCEPTION
        WHEN unique_violation THEN
            duplicate_rejected := TRUE;
            RAISE NOTICE 'PASS: Second Super Admin rejected.';
    END;

    -- Test 2: A Resident cannot become Super Admin.
    BEGIN
        UPDATE public.users
        SET is_super_admin = TRUE
        WHERE id = '00000000-0000-4000-8000-000000000004';

        RAISE EXCEPTION 'FAIL: Resident received Super Admin privilege.';
    EXCEPTION
        WHEN check_violation THEN
            resident_rejected := TRUE;
            RAISE NOTICE 'PASS: Resident Super Admin assignment rejected.';
    END;

    IF NOT duplicate_rejected OR NOT resident_rejected THEN
        RAISE EXCEPTION 'One or more database protection tests failed.';
    END IF;
END $$;

ROLLBACK;
