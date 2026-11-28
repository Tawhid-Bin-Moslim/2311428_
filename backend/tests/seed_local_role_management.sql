BEGIN;

INSERT INTO buildings (
    id, building_code, name, address,
    total_floors, total_flats, status
)
VALUES
(
    'aaaaaaaa-1111-4111-8111-111111111111',
    'LOCAL-TEST-A', 'Local Test Building A',
    'Local Test Address A', 5, 10, 'active'
),
(
    'bbbbbbbb-2222-4222-8222-222222222222',
    'LOCAL-TEST-B', 'Local Test Building B',
    'Local Test Address B', 5, 10, 'active'
),
(
    'cccccccc-3333-4333-8333-333333333333',
    'LOCAL-TEST-C', 'Local Test Building C',
    'Local Test Address C', 5, 10, 'active'
),
(
    'dddddddd-4444-4444-8444-444444444444',
    'LOCAL-TEST-D', 'Local Test Building D',
    'Local Test Address D', 5, 10, 'active'
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO flats (
    id, building_id, flat_number, floor_number
)
VALUES
(
    'aaaa0001-1111-4111-8111-111111111111',
    'aaaaaaaa-1111-4111-8111-111111111111',
    'A-101', 1
),
(
    'bbbb0001-2222-4222-8222-222222222222',
    'bbbbbbbb-2222-4222-8222-222222222222',
    'B-101', 1
),
(
    'cccc0001-3333-4333-8333-333333333333',
    'cccccccc-3333-4333-8333-333333333333',
    'C-101', 1
),
(
    'dddd0001-4444-4444-8444-444444444444',
    'dddddddd-4444-4444-8444-444444444444',
    'D-101', 1
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO users (
    id, login_id, full_name, email,
    password_hash, role, is_active
)
VALUES
(
    '00000000-0000-4000-8000-000000000001',
    '01', 'Local Super Admin',
    'admin1234@gmail.com',
    'LOCAL_TEST_ONLY_NOT_FOR_LOGIN',
    'admin', TRUE
),
(
    '00000000-0000-4000-8000-000000000002',
    '02', 'Local Normal Admin',
    'normal-admin-local@example.test',
    'LOCAL_TEST_ONLY_NOT_FOR_LOGIN',
    'admin', TRUE
),
(
    '00000000-0000-4000-8000-000000000003',
    '1001', 'Local Building Manager',
    'manager-local@example.test',
    'LOCAL_TEST_ONLY_NOT_FOR_LOGIN',
    'building_manager', TRUE
),
(
    '00000000-0000-4000-8000-000000000004',
    NULL, 'Local Resident One',
    'resident-one-local@example.test',
    'LOCAL_TEST_ONLY_NOT_FOR_LOGIN',
    'resident', TRUE
),
(
    '00000000-0000-4000-8000-000000000005',
    NULL, 'Local Resident Two',
    'resident-two-local@example.test',
    'LOCAL_TEST_ONLY_NOT_FOR_LOGIN',
    'resident', TRUE
),
(
    '00000000-0000-4000-8000-000000000006',
    NULL, 'Local Resident Three',
    'resident-three-local@example.test',
    'LOCAL_TEST_ONLY_NOT_FOR_LOGIN',
    'resident', TRUE
)
ON CONFLICT (id) DO NOTHING;


INSERT INTO occupancies (
    resident_id, flat_id, occupancy_type
)
VALUES
(
    '00000000-0000-4000-8000-000000000004',
    'aaaa0001-1111-4111-8111-111111111111',
    'owner'
),
(
    '00000000-0000-4000-8000-000000000005',
    'bbbb0001-2222-4222-8222-222222222222',
    'tenant'
),
(
    '00000000-0000-4000-8000-000000000006',
    'cccc0001-3333-4333-8333-333333333333',
    'tenant'
)
ON CONFLICT DO NOTHING;


INSERT INTO building_manager_assignments (
    manager_id, building_id
)
VALUES (
    '00000000-0000-4000-8000-000000000003',
    'bbbbbbbb-2222-4222-8222-222222222222'
)
ON CONFLICT DO NOTHING;

COMMIT;
