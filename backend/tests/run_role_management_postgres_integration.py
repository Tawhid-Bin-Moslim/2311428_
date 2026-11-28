import getpass
import re
import sys
from pathlib import Path
from uuid import UUID, uuid4

import psycopg

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from schemas.users import ChangeUserRoleRequest
from services import role_management


HOST = "127.0.0.1"
PORT = 5432
DATABASE = "apartmentcare_test"
DB_USER = "postgres"

SUPER_ADMIN_ID = UUID("00000000-0000-4000-8000-000000000001")
NORMAL_ADMIN_ID = UUID("00000000-0000-4000-8000-000000000002")

PASSWORD = None


def connect_local():
    """Connect exclusively to the local integration-test database."""
    return psycopg.connect(
        host=HOST,
        port=PORT,
        dbname=DATABASE,
        user=DB_USER,
        password=PASSWORD,
        sslmode="disable",
        connect_timeout=5,
        application_name="ApartmentCare local role integration test",
    )


def verify_environment():
    with connect_local() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT current_database(), host(inet_server_addr())"
            )
            database, server = cur.fetchone()

            if database != DATABASE or server != HOST:
                raise RuntimeError(
                    f"Unsafe database connection refused: {database}, {server}"
                )

            cur.execute(
                """
                SELECT id
                FROM users
                WHERE id = %s
                  AND role = 'admin'
                  AND is_active = TRUE
                  AND is_super_admin = TRUE
                """,
                (str(SUPER_ADMIN_ID),),
            )
            if cur.fetchone() is None:
                raise RuntimeError(
                    "Expected local Super Admin fixture is missing."
                )

            cur.execute(
                """
                SELECT id
                FROM users
                WHERE id = %s
                  AND role = 'admin'
                  AND is_active = TRUE
                  AND is_super_admin = FALSE
                """,
                (str(NORMAL_ADMIN_ID),),
            )
            if cur.fetchone() is None:
                raise RuntimeError(
                    "Expected local normal Admin fixture is missing."
                )

    print("PASS: Connected only to local apartmentcare_test.")


def find_available_ids(cur, start, end, width, count):
    available = []

    for number in range(start, end + 1):
        candidate = str(number).zfill(width)

        cur.execute(
            "SELECT 1 FROM users WHERE login_id = %s",
            (candidate,),
        )

        if cur.fetchone() is None:
            available.append(candidate)

        if len(available) == count:
            return available

    raise RuntimeError("Not enough available test login IDs.")


def create_fixtures():
    suffix = uuid4().hex[:8]

    buildings = {key: uuid4() for key in "ABCDEFG"}
    flats = {key: uuid4() for key in ("A", "B", "C", "E", "G")}

    users = {
        "resident_to_manager": uuid4(),
        "resident_to_admin": uuid4(),
        "manager_to_resident": uuid4(),
        "manager_to_admin": uuid4(),
        "admin_to_resident": uuid4(),
        "admin_to_manager": uuid4(),
        "rollback_resident": uuid4(),
    }

    fixture_user_ids = list(users.values())
    fixture_building_ids = list(buildings.values())
    fixture_flat_ids = list(flats.values())

    with connect_local() as conn:
        with conn.cursor() as cur:

            admin_ids = find_available_ids(cur, 0, 99, 2, 2)
            manager_ids = find_available_ids(cur, 1000, 9999, 4, 2)

            building_rows = [
                (
                    buildings[key],
                    f"IT31-{suffix}-{key}",
                    f"Integration Test Building {key}",
                    f"Local integration address {key}",
                    5,
                    10,
                    "active",
                )
                for key in buildings
            ]

            cur.executemany(
                """
                INSERT INTO buildings (
                    id, building_code, name, address,
                    total_floors, total_flats, status
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                building_rows,
            )

            flat_rows = [
                (
                    flats[key],
                    buildings[key],
                    f"IT-{key}",
                    1,
                )
                for key in flats
            ]

            cur.executemany(
                """
                INSERT INTO flats (
                    id, building_id, flat_number, floor_number
                )
                VALUES (%s, %s, %s, %s)
                """,
                flat_rows,
            )

            user_rows = [
                (
                    users["resident_to_manager"],
                    None,
                    "Integration Resident One",
                    f"it31-{suffix}-r1@example.test",
                    "LOCAL_TEST_ONLY_NOT_FOR_LOGIN",
                    "resident",
                    True,
                ),
                (
                    users["resident_to_admin"],
                    None,
                    "Integration Resident Two",
                    f"it31-{suffix}-r2@example.test",
                    "LOCAL_TEST_ONLY_NOT_FOR_LOGIN",
                    "resident",
                    True,
                ),
                (
                    users["rollback_resident"],
                    None,
                    "Integration Rollback Resident",
                    f"it31-{suffix}-rollback@example.test",
                    "LOCAL_TEST_ONLY_NOT_FOR_LOGIN",
                    "resident",
                    True,
                ),
                (
                    users["manager_to_resident"],
                    manager_ids[0],
                    "Integration Manager One",
                    f"it31-{suffix}-m1@example.test",
                    "LOCAL_TEST_ONLY_NOT_FOR_LOGIN",
                    "building_manager",
                    True,
                ),
                (
                    users["manager_to_admin"],
                    manager_ids[1],
                    "Integration Manager Two",
                    f"it31-{suffix}-m2@example.test",
                    "LOCAL_TEST_ONLY_NOT_FOR_LOGIN",
                    "building_manager",
                    True,
                ),
                (
                    users["admin_to_resident"],
                    admin_ids[0],
                    "Integration Admin One",
                    f"it31-{suffix}-a1@example.test",
                    "LOCAL_TEST_ONLY_NOT_FOR_LOGIN",
                    "admin",
                    True,
                ),
                (
                    users["admin_to_manager"],
                    admin_ids[1],
                    "Integration Admin Two",
                    f"it31-{suffix}-a2@example.test",
                    "LOCAL_TEST_ONLY_NOT_FOR_LOGIN",
                    "admin",
                    True,
                ),
            ]

            cur.executemany(
                """
                INSERT INTO users (
                    id, login_id, full_name, email,
                    password_hash, role, is_active
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                user_rows,
            )

            occupancy_rows = [
                (users["resident_to_manager"], flats["A"], "owner"),
                (users["resident_to_admin"], flats["B"], "tenant"),
                (users["rollback_resident"], flats["G"], "tenant"),
            ]

            cur.executemany(
                """
                INSERT INTO occupancies (
                    resident_id, flat_id, occupancy_type
                )
                VALUES (%s, %s, %s)
                """,
                occupancy_rows,
            )

            assignment_rows = [
                (users["manager_to_resident"], buildings["C"]),
                (users["manager_to_admin"], buildings["D"]),
            ]

            cur.executemany(
                """
                INSERT INTO building_manager_assignments (
                    manager_id, building_id
                )
                VALUES (%s, %s)
                """,
                assignment_rows,
            )

    print("PASS: Temporary role-transition fixtures created.")

    return users, buildings, flats, fixture_user_ids, fixture_building_ids, fixture_flat_ids


def read_user(user_id):
    with connect_local() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT role, login_id, is_active, is_super_admin
                FROM users
                WHERE id = %s
                """,
                (str(user_id),),
            )
            return cur.fetchone()


def perform_transition(user_id, request, actor):
    result = role_management.change_user_role(
        user_id,
        request,
        actor,
    )

    if result["role"] != request.role:
        raise AssertionError("Unexpected role in service response.")

    state = read_user(user_id)

    if state is None or state[0] != request.role:
        raise AssertionError("Database role was not updated correctly.")

    if state[3]:
        raise AssertionError("A target account unexpectedly became Super Admin.")

    with connect_local() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*)
                FROM audit_logs
                WHERE action = 'user_role_changed'
                  AND entity_type = 'users'
                  AND entity_id = %s
                """,
                (str(user_id),),
            )

            if cur.fetchone()[0] < 1:
                raise AssertionError("Role-change audit log was not written.")

    return state


def assert_closed_occupancy(user_id):
    with connect_local() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*)
                FROM occupancies
                WHERE resident_id = %s
                  AND move_out_date IS NOT NULL
                """,
                (str(user_id),),
            )

            if cur.fetchone()[0] != 1:
                raise AssertionError("Previous occupancy was not preserved and closed.")


def assert_closed_assignment(user_id):
    with connect_local() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*)
                FROM building_manager_assignments
                WHERE manager_id = %s
                  AND assigned_until IS NOT NULL
                """,
                (str(user_id),),
            )

            if cur.fetchone()[0] != 1:
                raise AssertionError("Previous Manager assignment was not closed.")


def assert_active_occupancy(user_id, flat_id):
    with connect_local() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*)
                FROM occupancies
                WHERE resident_id = %s
                  AND flat_id = %s
                  AND move_out_date IS NULL
                """,
                (str(user_id), str(flat_id)),
            )

            if cur.fetchone()[0] != 1:
                raise AssertionError("New active occupancy was not created.")


def assert_active_assignment(user_id, building_id):
    with connect_local() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COUNT(*)
                FROM building_manager_assignments
                WHERE manager_id = %s
                  AND building_id = %s
                  AND assigned_until IS NULL
                """,
                (str(user_id), str(building_id)),
            )

            if cur.fetchone()[0] != 1:
                raise AssertionError("New active Manager assignment was not created.")


def test_all_six_transitions(users, buildings, flats):
    original_factory = role_management.get_connection
    role_management.get_connection = connect_local

    super_admin = {
        "id": str(SUPER_ADMIN_ID),
        "role": "admin",
        "is_super_admin": True,
    }

    normal_admin = {
        "id": str(NORMAL_ADMIN_ID),
        "role": "admin",
        "is_super_admin": False,
    }

    try:
        # 1. Resident -> Building Manager (normal Admin).
        uid = users["resident_to_manager"]
        state = perform_transition(
            uid,
            ChangeUserRoleRequest(
                role="building_manager",
                building_id=buildings["B"],
            ),
            normal_admin,
        )
        assert re.fullmatch(r"\d{4}", state[1])
        assert_closed_occupancy(uid)
        assert_active_assignment(uid, buildings["B"])
        print("PASS: Resident -> Building Manager.")

        # 2. Resident -> Admin (Super Admin).
        uid = users["resident_to_admin"]
        state = perform_transition(
            uid,
            ChangeUserRoleRequest(role="admin"),
            super_admin,
        )
        assert re.fullmatch(r"\d{2}", state[1])
        assert_closed_occupancy(uid)
        print("PASS: Resident -> Admin.")

        # 3. Building Manager -> Resident (normal Admin).
        uid = users["manager_to_resident"]
        state = perform_transition(
            uid,
            ChangeUserRoleRequest(
                role="resident",
                flat_id=flats["C"],
                occupancy_type="tenant",
            ),
            normal_admin,
        )
        assert state[1] is None
        assert_closed_assignment(uid)
        assert_active_occupancy(uid, flats["C"])
        print("PASS: Building Manager -> Resident.")

        # 4. Building Manager -> Admin (Super Admin).
        uid = users["manager_to_admin"]
        state = perform_transition(
            uid,
            ChangeUserRoleRequest(role="admin"),
            super_admin,
        )
        assert re.fullmatch(r"\d{2}", state[1])
        assert_closed_assignment(uid)
        print("PASS: Building Manager -> Admin.")

        # 5. Admin -> Resident (Super Admin).
        uid = users["admin_to_resident"]
        state = perform_transition(
            uid,
            ChangeUserRoleRequest(
                role="resident",
                flat_id=flats["E"],
                occupancy_type="owner",
            ),
            super_admin,
        )
        assert state[1] is None
        assert_active_occupancy(uid, flats["E"])
        print("PASS: Admin -> Resident.")

        # 6. Admin -> Building Manager (Super Admin).
        uid = users["admin_to_manager"]
        state = perform_transition(
            uid,
            ChangeUserRoleRequest(
                role="building_manager",
                building_id=buildings["F"],
            ),
            super_admin,
        )
        assert re.fullmatch(r"\d{4}", state[1])
        assert_active_assignment(uid, buildings["F"])
        print("PASS: Admin -> Building Manager.")

    finally:
        role_management.get_connection = original_factory


def test_real_transaction_rollback(user_id, building_id):
    original_factory = role_management.get_connection
    role_management.get_connection = connect_local

    trigger_installed = False

    try:
        with connect_local() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE OR REPLACE FUNCTION
                    public.apartmentcare_it_reject_role_audit()
                    RETURNS trigger
                    LANGUAGE plpgsql
                    AS $$
                    BEGIN
                        IF NEW.action = 'user_role_changed' THEN
                            RAISE EXCEPTION
                                'Forced audit failure for integration test.';
                        END IF;
                        RETURN NEW;
                    END;
                    $$;
                    """
                )

                cur.execute(
                    """
                    DROP TRIGGER IF EXISTS apartmentcare_it_fail_role_audit
                    ON public.audit_logs
                    """
                )

                cur.execute(
                    """
                    CREATE TRIGGER apartmentcare_it_fail_role_audit
                    BEFORE INSERT ON public.audit_logs
                    FOR EACH ROW
                    EXECUTE FUNCTION public.apartmentcare_it_reject_role_audit()
                    """
                )

        trigger_installed = True

        request = ChangeUserRoleRequest(
            role="building_manager",
            building_id=building_id,
        )

        actor = {
            "id": str(NORMAL_ADMIN_ID),
            "role": "admin",
            "is_super_admin": False,
        }

        expected_failure = False

        try:
            role_management.change_user_role(
                user_id,
                request,
                actor,
            )
        except psycopg.Error:
            expected_failure = True

        if not expected_failure:
            raise AssertionError("The forced audit failure did not occur.")

        state = read_user(user_id)

        if state is None or state[0] != "resident" or state[1] is not None:
            raise AssertionError("User role update was not rolled back.")

        with connect_local() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT COUNT(*)
                    FROM occupancies
                    WHERE resident_id = %s
                      AND move_out_date IS NULL
                    """,
                    (str(user_id),),
                )

                if cur.fetchone()[0] != 1:
                    raise AssertionError("Occupancy update was not rolled back.")

                cur.execute(
                    """
                    SELECT COUNT(*)
                    FROM building_manager_assignments
                    WHERE manager_id = %s
                      AND assigned_until IS NULL
                    """,
                    (str(user_id),),
                )

                if cur.fetchone()[0] != 0:
                    raise AssertionError("Manager assignment was not rolled back.")

        print("PASS: Real PostgreSQL transaction rollback.")

    finally:
        role_management.get_connection = original_factory

        if trigger_installed:
            with connect_local() as conn:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        DROP TRIGGER IF EXISTS apartmentcare_it_fail_role_audit
                        ON public.audit_logs
                        """
                    )
                    cur.execute(
                        """
                        DROP FUNCTION IF EXISTS
                        public.apartmentcare_it_reject_role_audit()
                        """
                    )


def cleanup_fixtures(user_ids, building_ids, flat_ids):
    with connect_local() as conn:
        with conn.cursor() as cur:
            if user_ids:
                cur.execute(
                    """
                    DELETE FROM audit_logs
                    WHERE entity_type = 'users'
                      AND entity_id = ANY(%s)
                    """,
                    ([str(value) for value in user_ids],),
                )

                cur.execute(
                    """
                    DELETE FROM building_manager_assignments
                    WHERE manager_id = ANY(%s)
                    """,
                    (user_ids,),
                )

                cur.execute(
                    """
                    DELETE FROM occupancies
                    WHERE resident_id = ANY(%s)
                    """,
                    (user_ids,),
                )

                cur.execute(
                    "DELETE FROM users WHERE id = ANY(%s)",
                    (user_ids,),
                )

            if flat_ids:
                cur.execute(
                    "DELETE FROM flats WHERE id = ANY(%s)",
                    (flat_ids,),
                )

            if building_ids:
                cur.execute(
                    "DELETE FROM buildings WHERE id = ANY(%s)",
                    (building_ids,),
                )

    print("PASS: Temporary integration fixtures cleaned up.")


def main():
    global PASSWORD

    PASSWORD = getpass.getpass(
        "Local PostgreSQL password for apartmentcare_test (input hidden): "
    )

    if not PASSWORD:
        raise SystemExit(
            "No password entered. Test stopped without connecting to PostgreSQL."
        )

    users = {}
    buildings = {}
    flats = {}
    fixture_user_ids = []
    fixture_building_ids = []
    fixture_flat_ids = []
    fixtures_created = False

    try:
        verify_environment()

        (
            users,
            buildings,
            flats,
            fixture_user_ids,
            fixture_building_ids,
            fixture_flat_ids,
        ) = create_fixtures()

        fixtures_created = True

        test_all_six_transitions(users, buildings, flats)

        test_real_transaction_rollback(
            users["rollback_resident"],
            buildings["G"],
        )

        print("\nALL LOCAL POSTGRESQL INTEGRATION TESTS PASSED.")

    finally:
        if fixtures_created:
            cleanup_fixtures(
                fixture_user_ids,
                fixture_building_ids,
                fixture_flat_ids,
            )


if __name__ == "__main__":
    main()