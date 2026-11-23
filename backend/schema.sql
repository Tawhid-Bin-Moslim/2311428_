-- ApartmentCare: Core Database Schema
-- Migration 001
-- Roles: Admin, Building Manager, Resident
-- Database: PostgreSQL (Supabase)

BEGIN;
-- 0. MAINTENANCE REQUESTS
-- Create only if the table does not already exist.
-- Existing table, integer IDs, and records are preserved.

CREATE TABLE IF NOT EXISTS maintenance_requests (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(150) NOT NULL,
    priority VARCHAR(10) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_created_at
ON maintenance_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_maintenance_requests_status
ON maintenance_requests (status);

-- 1. USERS
-- Roles: admin, building_manager, resident
--
-- Admin ID: 2 digits
-- Manager ID: 4 digits
-- Resident login ID: derived from active flat occupancy

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    login_id VARCHAR(10),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,

    role VARCHAR(30) NOT NULL
        CHECK (role IN ('admin', 'building_manager', 'resident')),

    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT users_login_id_role_check CHECK (
        (
            role = 'admin'
            AND login_id IS NOT NULL
            AND login_id ~ '^[0-9]{2}$'
        )
        OR
        (
            role = 'building_manager'
            AND login_id IS NOT NULL
            AND login_id ~ '^[0-9]{4}$'
        )
        OR
        (
            role = 'resident'
            AND login_id IS NULL
        )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique
ON users (LOWER(email));

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login_id_unique
ON users (login_id)
WHERE role IN ('admin', 'building_manager');

CREATE INDEX IF NOT EXISTS idx_users_role
ON users (role);

-- 2. BUILDINGS

CREATE TABLE IF NOT EXISTS buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    building_code VARCHAR(30) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    address TEXT NOT NULL,

    total_floors INTEGER NOT NULL CHECK (total_floors > 0),
    total_flats INTEGER NOT NULL CHECK (total_flats > 0),

    contact_phone VARCHAR(30),

    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- 3. FLATS
-- Occupancy is determined from active occupancy records.

CREATE TABLE IF NOT EXISTS flats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    building_id UUID NOT NULL
        REFERENCES buildings(id) ON DELETE RESTRICT,

    flat_number VARCHAR(20) NOT NULL,
    floor_number INTEGER NOT NULL CHECK (floor_number >= 0),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT flats_building_flat_unique
        UNIQUE (building_id, flat_number),

    CONSTRAINT flats_id_building_unique
        UNIQUE (id, building_id)
);

CREATE INDEX IF NOT EXISTS idx_flats_building
ON flats (building_id);


-- 4. OCCUPANCIES
-- Multiple residents can share one flat.
-- A resident can have only one active flat at a time.

CREATE TABLE IF NOT EXISTS occupancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    resident_id UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    flat_id UUID NOT NULL
        REFERENCES flats(id) ON DELETE RESTRICT,

    occupancy_type VARCHAR(20) NOT NULL
        CHECK (occupancy_type IN ('owner', 'tenant')),

    move_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
    move_out_date DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT occupancy_dates_check CHECK (
        move_out_date IS NULL
        OR move_out_date >= move_in_date
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_flat_per_resident
ON occupancies (resident_id)
WHERE move_out_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_occupancies_flat
ON occupancies (flat_id);

-- 5. BUILDING MANAGER ASSIGNMENTS
-- A manager can have only one active building assignment.
-- A building can have at most one active manager.

CREATE TABLE IF NOT EXISTS building_manager_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    manager_id UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    building_id UUID NOT NULL
        REFERENCES buildings(id) ON DELETE RESTRICT,

    assigned_from DATE NOT NULL DEFAULT CURRENT_DATE,
    assigned_until DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT manager_assignment_dates_check CHECK (
        assigned_until IS NULL
        OR assigned_until >= assigned_from
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_building_per_manager
ON building_manager_assignments (manager_id)
WHERE assigned_until IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_manager_per_building
ON building_manager_assignments (building_id)
WHERE assigned_until IS NULL;

-- 6. EXTEND EXISTING MAINTENANCE REQUESTS
-- Existing records remain valid with NULL ownership fields.
-- New requests must have all three ownership fields.

ALTER TABLE maintenance_requests
ADD COLUMN IF NOT EXISTS resident_id UUID;

ALTER TABLE maintenance_requests
ADD COLUMN IF NOT EXISTS building_id UUID;

ALTER TABLE maintenance_requests
ADD COLUMN IF NOT EXISTS flat_id UUID;


-- Add ownership constraint safely (rerunnable).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'maintenance_ownership_fields_check'
          AND conrelid = 'public.maintenance_requests'::regclass
    ) THEN
        ALTER TABLE maintenance_requests
        ADD CONSTRAINT maintenance_ownership_fields_check
        CHECK (
            (
                resident_id IS NULL
                AND building_id IS NULL
                AND flat_id IS NULL
            )
            OR
            (
                resident_id IS NOT NULL
                AND building_id IS NOT NULL
                AND flat_id IS NOT NULL
            )
        );
    END IF;
END $$;


-- Add foreign keys safely (rerunnable).

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'maintenance_resident_fk'
          AND conrelid = 'public.maintenance_requests'::regclass
    ) THEN
        ALTER TABLE maintenance_requests
        ADD CONSTRAINT maintenance_resident_fk
        FOREIGN KEY (resident_id)
        REFERENCES users(id) ON DELETE RESTRICT;
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'maintenance_building_fk'
          AND conrelid = 'public.maintenance_requests'::regclass
    ) THEN
        ALTER TABLE maintenance_requests
        ADD CONSTRAINT maintenance_building_fk
        FOREIGN KEY (building_id)
        REFERENCES buildings(id) ON DELETE RESTRICT;
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'maintenance_flat_building_fk'
          AND conrelid = 'public.maintenance_requests'::regclass
    ) THEN
        ALTER TABLE maintenance_requests
        ADD CONSTRAINT maintenance_flat_building_fk
        FOREIGN KEY (flat_id, building_id)
        REFERENCES flats(id, building_id)
        ON DELETE RESTRICT;
    END IF;

END $$;


CREATE INDEX IF NOT EXISTS idx_maintenance_resident
ON maintenance_requests (resident_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_building
ON maintenance_requests (building_id);

-- 7. MAINTENANCE UPDATES
-- Stores maintenance communication and status history.

CREATE TABLE IF NOT EXISTS maintenance_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    request_id INTEGER NOT NULL
        REFERENCES maintenance_requests(id) ON DELETE CASCADE,

    updated_by UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    message TEXT NOT NULL,

    previous_status VARCHAR(20),
    new_status VARCHAR(20),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT maintenance_update_previous_status_check CHECK (
        previous_status IS NULL
        OR previous_status IN ('pending', 'in_progress', 'completed')
    ),

    CONSTRAINT maintenance_update_new_status_check CHECK (
        new_status IS NULL
        OR new_status IN ('pending', 'in_progress', 'completed')
    )
);

CREATE INDEX IF NOT EXISTS idx_maintenance_updates_request
ON maintenance_updates (request_id, created_at DESC);

-- 8. BILLS
-- paid_amount is calculated from approved payments.

CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    resident_id UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    building_id UUID NOT NULL
        REFERENCES buildings(id) ON DELETE RESTRICT,

    billing_month DATE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'partially_paid',
                'paid',
                'overdue',
                'cancelled'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT bill_month_first_day_check CHECK (
        EXTRACT(DAY FROM billing_month) = 1
    ),

    CONSTRAINT bill_resident_month_unique
        UNIQUE (resident_id, building_id, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_bills_resident
ON bills (resident_id);

CREATE INDEX IF NOT EXISTS idx_bills_building_month
ON bills (building_id, billing_month);

-- 9. PAYMENTS
-- One bill can have multiple payment attempts.
-- Pending payments cannot have verification information.
-- Approved/rejected payments require verification information.
-- Rejected payments require a reason.

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    bill_id UUID NOT NULL
        REFERENCES bills(id) ON DELETE RESTRICT,

    verified_by UUID
        REFERENCES users(id) ON DELETE RESTRICT,

    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    receipt_url TEXT,

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),

    rejection_reason TEXT,

    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMPTZ,

    CONSTRAINT payment_verification_check CHECK (
        (
            status = 'pending'
            AND verified_by IS NULL
            AND verified_at IS NULL
            AND rejection_reason IS NULL
        )
        OR
        (
            status = 'approved'
            AND verified_by IS NOT NULL
            AND verified_at IS NOT NULL
            AND rejection_reason IS NULL
        )
        OR
        (
            status = 'rejected'
            AND verified_by IS NOT NULL
            AND verified_at IS NOT NULL
            AND rejection_reason IS NOT NULL
            AND LENGTH(TRIM(rejection_reason)) > 0
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_payments_bill
ON payments (bill_id);

CREATE INDEX IF NOT EXISTS idx_payments_status
ON payments (status);

-- 10. ANNOUNCEMENTS
-- building_id NULL means system-wide announcement.
-- Published announcements must have a publication date.

CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    building_id UUID
        REFERENCES buildings(id) ON DELETE RESTRICT,

    created_by UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,

    category VARCHAR(30) NOT NULL DEFAULT 'general'
        CHECK (
            category IN (
                'general',
                'maintenance',
                'billing',
                'security'
            )
        ),

    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'published', 'archived')),

    published_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT announcement_dates_check CHECK (
        expires_at IS NULL
        OR published_at IS NULL
        OR expires_at >= published_at
    ),

    CONSTRAINT announcement_published_date_check CHECK (
        status <> 'published'
        OR published_at IS NOT NULL
    )
);

CREATE INDEX IF NOT EXISTS idx_announcements_building
ON announcements (building_id, status);

-- 11. VISITOR PASSES

CREATE TABLE IF NOT EXISTS visitor_passes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    resident_id UUID NOT NULL
        REFERENCES users(id) ON DELETE RESTRICT,

    flat_id UUID NOT NULL
        REFERENCES flats(id) ON DELETE RESTRICT,

    visitor_name VARCHAR(150) NOT NULL,
    expected_arrival TIMESTAMPTZ NOT NULL,

    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'approved',
                'rejected',
                'used',
                'cancelled'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visitor_passes_flat
ON visitor_passes (flat_id);

CREATE INDEX IF NOT EXISTS idx_visitor_passes_resident
ON visitor_passes (resident_id);

-- 12. AUDIT LOGS
-- entity_id is TEXT to support UUID and integer IDs.

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID
        REFERENCES users(id) ON DELETE SET NULL,

    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id TEXT,

    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user
ON audit_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
ON audit_logs (created_at DESC);
-- END OF MIGRATION 001

COMMIT;