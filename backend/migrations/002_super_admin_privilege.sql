
BEGIN;

-- 1. Add the Super Admin privilege.
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_super_admin
BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Verify the initial Super Admin account.
DO $$
DECLARE
    target_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO target_count
    FROM public.users
    WHERE LOWER(email) = LOWER('admin1234@gmail.com');

    IF target_count <> 1 THEN
        RAISE EXCEPTION
            'Expected exactly one admin1234@gmail.com account. Found %.',
            target_count;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.users
        WHERE LOWER(email) = LOWER('admin1234@gmail.com')
          AND role = 'admin'
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION
            'The Super Admin account must be an active Admin.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.users
        WHERE is_super_admin = TRUE
          AND LOWER(email) <> LOWER('admin1234@gmail.com')
    ) THEN
        RAISE EXCEPTION
            'Another Super Admin account already exists.';
    END IF;

    UPDATE public.users
    SET is_super_admin = TRUE
    WHERE LOWER(email) = LOWER('admin1234@gmail.com');
END $$;

-- 3. Only Admin accounts may be Super Admin.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'users_super_admin_role_check'
          AND conrelid = 'public.users'::regclass
    ) THEN
        ALTER TABLE public.users
        ADD CONSTRAINT users_super_admin_role_check
        CHECK (
            NOT is_super_admin OR role = 'admin'
        );
    END IF;
END $$;

-- 4. Enforce a single Super Admin account.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_single_super_admin
ON public.users (is_super_admin)
WHERE is_super_admin = TRUE;

COMMIT;
