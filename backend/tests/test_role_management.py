import unittest
from uuid import uuid4
from unittest.mock import patch

from fastapi import HTTPException

from schemas.users import ChangeUserRoleRequest
from services.role_management import change_user_role


class FakeCursor:
    """Small database cursor substitute for isolated service tests."""

    def __init__(
        self,
        target_role,
        actor_is_super_admin=False,
        target_is_super_admin=False,
        flat_building_id=None,
        fail_on_audit=False,
    ):
        self.actor_id = uuid4()
        self.target_id = uuid4()
        self.building_id = uuid4()
        self.flat_id = uuid4()
        self.occupancy_id = uuid4()
        self.assignment_id = uuid4()

        self.target_role = target_role
        self.actor_is_super_admin = actor_is_super_admin
        self.target_is_super_admin = target_is_super_admin
        self.flat_building_id = flat_building_id or self.building_id
        self.fail_on_audit = fail_on_audit

        self.one = None
        self.many = []
        self.statements = []

    def execute(self, query, params=None):
        sql = " ".join(query.split()).lower()
        self.statements.append((sql, params))

        self.one = None
        self.many = []

        if sql.startswith(
            "select role, is_active, is_super_admin from users"
        ):
            self.one = (
                "admin",
                True,
                self.actor_is_super_admin,
            )

        elif sql.startswith(
            "select id, full_name, email, role, login_id, "
            "is_active, is_super_admin from users"
        ):
            login_id = {
                "admin": "12",
                "building_manager": "1234",
                "resident": None,
            }[self.target_role]

            self.one = (
                self.target_id,
                "Test User",
                "test@example.com",
                self.target_role,
                login_id,
                True,
                self.target_is_super_admin,
            )

        elif sql.startswith(
            "select o.id, o.flat_id, f.building_id"
        ):
            self.many = [
                (
                    self.occupancy_id,
                    self.flat_id,
                    self.building_id,
                )
            ]

        elif sql.startswith(
            "select id, building_id from building_manager_assignments"
        ):
            self.many = [
                (
                    self.assignment_id,
                    self.building_id,
                )
            ]

        elif sql.startswith("select id from occupancies"):
            self.one = None

        elif sql.startswith(
            "select id from building_manager_assignments"
        ):
            self.one = None

        elif sql.startswith("select id from buildings"):
            self.one = (self.building_id,)

        elif sql.startswith("select f.id, f.building_id"):
            self.one = (
                self.flat_id,
                self.flat_building_id,
            )

        elif sql.startswith("select lpad(candidate::text"):
            self.one = ("42",)

        elif sql.startswith("select candidate::text"):
            self.one = ("1234",)

        elif sql.startswith("insert into audit_logs"):
            if self.fail_on_audit:
                raise RuntimeError("Simulated audit insert failure")

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


class RoleManagementTests(unittest.TestCase):

    def make_request(self, cursor, new_role):
        if new_role == "admin":
            return ChangeUserRoleRequest(role="admin")

        if new_role == "building_manager":
            return ChangeUserRoleRequest(
                role="building_manager",
                building_id=cursor.building_id,
            )

        return ChangeUserRoleRequest(
            role="resident",
            flat_id=cursor.flat_id,
            occupancy_type="tenant",
        )

    def run_transition(
        self,
        old_role,
        new_role,
        actor_is_super_admin,
    ):
        cursor = FakeCursor(
            target_role=old_role,
            actor_is_super_admin=actor_is_super_admin,
        )
        connection = FakeConnection(cursor)

        current_user = {
            "id": str(cursor.actor_id),
            "role": "admin",
            "is_super_admin": actor_is_super_admin,
        }

        request = self.make_request(cursor, new_role)

        with patch(
            "services.role_management.get_connection",
            return_value=connection,
        ):
            result = change_user_role(
                cursor.target_id,
                request,
                current_user,
            )

        self.assertEqual(result["role"], new_role)
        self.assertEqual(result["id"], cursor.target_id)

        # Verify the exact role and login ID written to users.
        role_updates = [
            (sql, params)
            for sql, params in cursor.statements
            if sql.startswith("update users set role = %s")
        ]
        self.assertEqual(len(role_updates), 1)

        expected_login_id = {
            "admin": "42",
            "building_manager": "1234",
            "resident": None,
        }[new_role]

        self.assertEqual(
            role_updates[0][1],
            (new_role, expected_login_id, str(cursor.target_id)),
        )

        # Verify that the previous relationship is closed.
        if old_role == "resident" and new_role != "resident":
            self.assertIn(
                (
                    "update occupancies set move_out_date = current_date "
                    "where id = %s and move_out_date is null",
                    (cursor.occupancy_id,),
                ),
                cursor.statements,
            )

        if old_role == "building_manager" and new_role != "building_manager":
            self.assertIn(
                (
                    "update building_manager_assignments "
                    "set assigned_until = current_date "
                    "where id = %s and assigned_until is null",
                    (cursor.assignment_id,),
                ),
                cursor.statements,
            )

        # Verify the new relationship is inserted.
        if new_role == "building_manager":
            self.assertIn(
                (
                    "insert into building_manager_assignments "
                    "( manager_id, building_id, assigned_from ) "
                    "values (%s, %s, current_date)",
                    (str(cursor.target_id), str(cursor.building_id)),
                ),
                cursor.statements,
            )

        if new_role == "resident":
            self.assertIn(
                (
                    "insert into occupancies "
                    "( resident_id, flat_id, occupancy_type, move_in_date ) "
                    "values (%s, %s, %s, current_date)",
                    (
                        str(cursor.target_id),
                        str(cursor.flat_id),
                        "tenant",
                    ),
                ),
                cursor.statements,
            )

        # Verify the audit log actor, action, entity and target.
        audit_entries = [
            params
            for sql, params in cursor.statements
            if sql.startswith("insert into audit_logs")
        ]
        self.assertEqual(len(audit_entries), 1)
        self.assertEqual(
            audit_entries[0][:4],
            (
                str(cursor.actor_id),
                "user_role_changed",
                "users",
                str(cursor.target_id),
            ),
        )

        self.assertTrue(connection.committed)
        self.assertFalse(connection.rolled_back)
        self.assertTrue(
            any(
                sql.startswith("insert into audit_logs")
                for sql, _ in cursor.statements
            )
        )

    def test_all_six_role_transitions(self):
        transitions = [
            ("resident", "building_manager", False),
            ("resident", "admin", True),
            ("building_manager", "resident", False),
            ("building_manager", "admin", True),
            ("admin", "resident", True),
            ("admin", "building_manager", True),
        ]

        for old_role, new_role, is_super_admin in transitions:
            with self.subTest(
                old_role=old_role,
                new_role=new_role,
            ):
                self.run_transition(
                    old_role,
                    new_role,
                    is_super_admin,
                )

    def test_normal_admin_cannot_create_an_admin(self):
        cursor = FakeCursor(
            target_role="resident",
            actor_is_super_admin=False,
        )
        connection = FakeConnection(cursor)

        request = ChangeUserRoleRequest(role="admin")

        current_user = {
            "id": str(cursor.actor_id),
            "role": "admin",
            "is_super_admin": False,
        }

        with patch(
            "services.role_management.get_connection",
            return_value=connection,
        ):
            with self.assertRaises(HTTPException) as error:
                change_user_role(
                    cursor.target_id,
                    request,
                    current_user,
                )

        self.assertEqual(error.exception.status_code, 403)
        self.assertTrue(connection.rolled_back)

    def test_normal_admin_cannot_modify_an_admin(self):
        cursor = FakeCursor(
            target_role="admin",
            actor_is_super_admin=False,
        )
        connection = FakeConnection(cursor)

        request = self.make_request(cursor, "resident")

        current_user = {
            "id": str(cursor.actor_id),
            "role": "admin",
            "is_super_admin": False,
        }

        with patch(
            "services.role_management.get_connection",
            return_value=connection,
        ):
            with self.assertRaises(HTTPException) as error:
                change_user_role(
                    cursor.target_id,
                    request,
                    current_user,
                )

        self.assertEqual(error.exception.status_code, 403)

    def test_super_admin_account_is_protected(self):
        cursor = FakeCursor(
            target_role="admin",
            actor_is_super_admin=True,
            target_is_super_admin=True,
        )
        connection = FakeConnection(cursor)

        request = self.make_request(cursor, "resident")

        current_user = {
            "id": str(cursor.actor_id),
            "role": "admin",
            "is_super_admin": True,
        }

        with patch(
            "services.role_management.get_connection",
            return_value=connection,
        ):
            with self.assertRaises(HTTPException) as error:
                change_user_role(
                    cursor.target_id,
                    request,
                    current_user,
                )

        self.assertEqual(error.exception.status_code, 403)

    def test_user_cannot_change_own_role(self):
        cursor = FakeCursor(target_role="resident")

        request = self.make_request(cursor, "building_manager")

        current_user = {
            "id": str(cursor.target_id),
            "role": "admin",
            "is_super_admin": True,
        }

        with patch(
            "services.role_management.get_connection"
        ) as mock_connection:
            with self.assertRaises(HTTPException) as error:
                change_user_role(
                    cursor.target_id,
                    request,
                    current_user,
                )

        self.assertEqual(error.exception.status_code, 409)
        mock_connection.assert_not_called()

    def test_manager_cannot_be_assigned_a_flat_in_another_building(self):
        other_building_id = uuid4()

        cursor = FakeCursor(
            target_role="building_manager",
            flat_building_id=other_building_id,
        )
        connection = FakeConnection(cursor)

        request = self.make_request(cursor, "resident")

        current_user = {
            "id": str(cursor.actor_id),
            "role": "admin",
            "is_super_admin": False,
        }

        with patch(
            "services.role_management.get_connection",
            return_value=connection,
        ):
            with self.assertRaises(HTTPException) as error:
                change_user_role(
                    cursor.target_id,
                    request,
                    current_user,
                )

        self.assertEqual(error.exception.status_code, 400)
        self.assertTrue(connection.rolled_back)

    def test_audit_failure_rolls_back_transaction(self):
        cursor = FakeCursor(
            target_role="resident",
            fail_on_audit=True,
        )
        connection = FakeConnection(cursor)

        request = self.make_request(cursor, "building_manager")

        current_user = {
            "id": str(cursor.actor_id),
            "role": "admin",
            "is_super_admin": False,
        }

        with patch(
            "services.role_management.get_connection",
            return_value=connection,
        ):
            with self.assertRaises(RuntimeError):
                change_user_role(
                    cursor.target_id,
                    request,
                    current_user,
                )

        self.assertTrue(connection.rolled_back)
        self.assertFalse(connection.committed)


if __name__ == "__main__":
    unittest.main(verbosity=2)
