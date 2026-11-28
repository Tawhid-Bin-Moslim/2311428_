import unittest
from datetime import date
from uuid import uuid4
from unittest.mock import patch

from fastapi import HTTPException

from schemas.residents import CreateResidentRequest
from services.residents import create_resident, deactivate_resident


class FakeCursor:
    def __init__(
        self,
        actor_role="admin",
        actor_active=True,
        target_role="resident",
        target_active=True,
        flat_access=True,
        assignment_exists=True,
        fail_on_audit=False,
    ):
        self.actor_id = str(uuid4())
        self.target_id = uuid4()
        self.flat_id = uuid4()
        self.building_id = uuid4()
        self.occupancy_id = uuid4()

        self.actor_role = actor_role
        self.actor_active = actor_active
        self.target_role = target_role
        self.target_active = target_active
        self.flat_access = flat_access
        self.assignment_exists = assignment_exists
        self.fail_on_audit = fail_on_audit

        self.flat_row = (
            self.flat_id,
            "A-101",
            1,
            self.building_id,
            "Building A",
        )

        self.one = None
        self.many = []
        self.statements = []
        self.audit_params = None
        self.user_inserted = False
        self.occupancy_inserted = False
        self.occupancy_closed = False
        self.user_deactivated = False

    def execute(self, query, params=None):
        sql = " ".join(query.split()).lower()
        self.statements.append((sql, params))

        self.one = None
        self.many = []

        if (
            sql.startswith("select role, is_active from users")
            and "for share" in sql
        ):
            self.one = (self.actor_role, self.actor_active)

        elif sql.startswith(
            "select f.id, f.flat_number, f.floor_number, b.id, b.name"
        ):
            self.one = self.flat_row if self.flat_access else None

        elif sql.startswith("insert into users"):
            self.user_inserted = True
            self.one = (self.target_id,)

        elif sql.startswith("insert into occupancies"):
            self.occupancy_inserted = True
            self.one = (self.occupancy_id, date.today())

        elif sql.startswith(
            "select role, is_active, full_name from users"
        ):
            self.one = (
                self.target_role,
                self.target_active,
                "Test Resident",
            )

        elif sql.startswith(
            "select o.id, o.move_in_date, f.building_id from occupancies"
        ):
            self.many = [
                (self.occupancy_id, date.today(), self.building_id)
            ]

        elif sql.startswith(
            "select 1 from building_manager_assignments"
        ):
            self.one = (1,) if self.assignment_exists else None

        elif sql.startswith("update occupancies"):
            self.occupancy_closed = True

        elif sql.startswith("update users set is_active"):
            self.user_deactivated = True

        elif sql.startswith("insert into audit_logs"):
            if self.fail_on_audit:
                raise RuntimeError("Simulated audit failure.")
            self.audit_params = params

        else:
            raise AssertionError(f"Unexpected SQL in test: {sql}")

    def fetchone(self):
        return self.one

    def fetchall(self):
        return self.many


class FakeCursorContext:
    def __init__(self, cursor):
        self.cursor = cursor

    def __enter__(self):
        return self.cursor

    def __exit__(self, exc_type, exc_value, traceback):
        return False


class FakeConnection:
    def __init__(self, cursor):
        self.fake_cursor = cursor
        self.committed = False
        self.rolled_back = False

    def cursor(self):
        return FakeCursorContext(self.fake_cursor)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.rolled_back = exc_type is not None
        self.committed = exc_type is None
        return False


class ResidentLifecycleTests(unittest.TestCase):

    def make_request(self, cursor):
        return CreateResidentRequest(
            full_name="Test Resident",
            email="resident@example.test",
            flat_id=cursor.flat_id,
            password="test-password-123",
            occupancy_type="tenant",
        )

    def test_admin_can_create_resident(self):
        cursor = FakeCursor(actor_role="admin")
        connection = FakeConnection(cursor)
        request = self.make_request(cursor)
        current_user = {
            "id": cursor.actor_id,
            "role": "admin",
        }

        with (
            patch(
                "services.residents.get_connection",
                return_value=connection,
            ),
            patch(
                "services.residents.hash_password",
                return_value="hashed-test-password",
            ),
        ):
            result = create_resident(request, current_user)

        self.assertEqual(result["id"], cursor.target_id)
        self.assertEqual(result["role"], "resident")
        self.assertEqual(result["flat_id"], cursor.flat_id)
        self.assertEqual(result["building_id"], cursor.building_id)
        self.assertTrue(cursor.user_inserted)
        self.assertTrue(cursor.occupancy_inserted)
        self.assertIsNotNone(cursor.audit_params)
        self.assertEqual(
            cursor.audit_params[1],
            "resident_account_created",
        )
        self.assertTrue(connection.committed)

    def test_manager_can_create_resident_in_own_building(self):
        cursor = FakeCursor(
            actor_role="building_manager",
            flat_access=True,
        )
        connection = FakeConnection(cursor)
        request = self.make_request(cursor)
        current_user = {
            "id": cursor.actor_id,
            "role": "building_manager",
        }

        with (
            patch(
                "services.residents.get_connection",
                return_value=connection,
            ),
            patch(
                "services.residents.hash_password",
                return_value="hashed-test-password",
            ),
        ):
            result = create_resident(request, current_user)

        self.assertEqual(result["role"], "resident")
        self.assertTrue(cursor.user_inserted)
        self.assertTrue(cursor.occupancy_inserted)
        self.assertTrue(connection.committed)

    def test_manager_cannot_create_resident_outside_own_building(self):
        cursor = FakeCursor(
            actor_role="building_manager",
            flat_access=False,
        )
        connection = FakeConnection(cursor)
        request = self.make_request(cursor)
        current_user = {
            "id": cursor.actor_id,
            "role": "building_manager",
        }

        with (
            patch(
                "services.residents.get_connection",
                return_value=connection,
            ),
            patch(
                "services.residents.hash_password",
            ) as hash_mock,
        ):
            with self.assertRaises(HTTPException) as error:
                create_resident(request, current_user)

        self.assertEqual(error.exception.status_code, 404)
        self.assertFalse(cursor.user_inserted)
        self.assertFalse(cursor.occupancy_inserted)
        hash_mock.assert_not_called()
        self.assertTrue(connection.rolled_back)

    def test_creation_audit_failure_rolls_back_transaction(self):
        cursor = FakeCursor(
            actor_role="admin",
            fail_on_audit=True,
        )
        connection = FakeConnection(cursor)
        request = self.make_request(cursor)
        current_user = {
            "id": cursor.actor_id,
            "role": "admin",
        }

        with (
            patch(
                "services.residents.get_connection",
                return_value=connection,
            ),
            patch(
                "services.residents.hash_password",
                return_value="hashed-test-password",
            ),
        ):
            with self.assertRaises(RuntimeError):
                create_resident(request, current_user)

        self.assertTrue(cursor.user_inserted)
        self.assertTrue(cursor.occupancy_inserted)
        self.assertTrue(connection.rolled_back)
        self.assertFalse(connection.committed)

    def test_manager_can_deactivate_resident_in_own_building(self):
        cursor = FakeCursor(
            actor_role="building_manager",
            target_role="resident",
            assignment_exists=True,
        )
        connection = FakeConnection(cursor)
        current_user = {
            "id": cursor.actor_id,
            "role": "building_manager",
        }

        with patch(
            "services.residents.get_connection",
            return_value=connection,
        ):
            result = deactivate_resident(
                cursor.target_id,
                current_user,
            )

        self.assertEqual(result["id"], cursor.target_id)
        self.assertTrue(cursor.occupancy_closed)
        self.assertTrue(cursor.user_deactivated)
        self.assertIsNotNone(cursor.audit_params)
        self.assertEqual(
            cursor.audit_params[1],
            "resident_account_deactivated",
        )
        self.assertFalse(
            any(sql.startswith("delete ") for sql, _ in cursor.statements)
        )
        self.assertTrue(connection.committed)

    def test_manager_cannot_deactivate_resident_in_another_building(self):
        cursor = FakeCursor(
            actor_role="building_manager",
            target_role="resident",
            assignment_exists=False,
        )
        connection = FakeConnection(cursor)
        current_user = {
            "id": cursor.actor_id,
            "role": "building_manager",
        }

        with patch(
            "services.residents.get_connection",
            return_value=connection,
        ):
            with self.assertRaises(HTTPException) as error:
                deactivate_resident(
                    cursor.target_id,
                    current_user,
                )

        self.assertEqual(error.exception.status_code, 403)
        self.assertFalse(cursor.occupancy_closed)
        self.assertFalse(cursor.user_deactivated)
        self.assertTrue(connection.rolled_back)

    def test_admin_cannot_deactivate_resident(self):
        cursor = FakeCursor(actor_role="admin")
        connection = FakeConnection(cursor)
        current_user = {
            "id": cursor.actor_id,
            "role": "admin",
        }

        with patch(
            "services.residents.get_connection",
            return_value=connection,
        ):
            with self.assertRaises(HTTPException) as error:
                deactivate_resident(
                    cursor.target_id,
                    current_user,
                )

        self.assertEqual(error.exception.status_code, 403)
        self.assertTrue(connection.rolled_back)

    def test_inactive_resident_cannot_be_deactivated_again(self):
        cursor = FakeCursor(
            actor_role="building_manager",
            target_active=False,
        )
        connection = FakeConnection(cursor)
        current_user = {
            "id": cursor.actor_id,
            "role": "building_manager",
        }

        with patch(
            "services.residents.get_connection",
            return_value=connection,
        ):
            with self.assertRaises(HTTPException) as error:
                deactivate_resident(
                    cursor.target_id,
                    current_user,
                )

        self.assertEqual(error.exception.status_code, 404)
        self.assertFalse(cursor.occupancy_closed)
        self.assertFalse(cursor.user_deactivated)

    def test_deactivation_audit_failure_rolls_back_transaction(self):
        cursor = FakeCursor(
            actor_role="building_manager",
            target_role="resident",
            fail_on_audit=True,
        )
        connection = FakeConnection(cursor)
        current_user = {
            "id": cursor.actor_id,
            "role": "building_manager",
        }

        with patch(
            "services.residents.get_connection",
            return_value=connection,
        ):
            with self.assertRaises(RuntimeError):
                deactivate_resident(
                    cursor.target_id,
                    current_user,
                )

        self.assertTrue(cursor.occupancy_closed)
        self.assertTrue(cursor.user_deactivated)
        self.assertTrue(connection.rolled_back)
        self.assertFalse(connection.committed)


if __name__ == "__main__":
    unittest.main(verbosity=2)