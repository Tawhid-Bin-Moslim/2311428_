import unittest
from uuid import uuid4
from unittest.mock import patch

from fastapi import HTTPException

from schemas.residents import ResetPasswordRequest
from services.residents import reset_account_password


class FakeCursor:
    def __init__(
        self,
        actor_role="admin",
        actor_active=True,
        target_role="resident",
        target_active=True,
        resident_building_id=None,
        assignment_exists=True,
        fail_on_audit=False,
    ):
        self.actor_id = str(uuid4())
        self.target_id = uuid4()
        self.building_id = resident_building_id or uuid4()

        self.actor_role = actor_role
        self.actor_active = actor_active
        self.target_role = target_role
        self.target_active = target_active
        self.assignment_exists = assignment_exists
        self.fail_on_audit = fail_on_audit

        self.one = None
        self.many = []
        self.password_update = None
        self.audit_params = None
        self.target_was_checked = False

    def execute(self, query, params=None):
        sql = " ".join(query.split()).lower()

        self.one = None
        self.many = []

        if "select role, is_active from users" in sql and "for share" in sql:
            self.one = (self.actor_role, self.actor_active)

        elif "select role, is_active from users" in sql and "for update" in sql:
            self.target_was_checked = True
            self.one = (self.target_role, self.target_active)

        elif sql.startswith("select f.building_id from occupancies"):
            self.many = [(self.building_id,)]

        elif sql.startswith("select 1 from building_manager_assignments"):
            self.one = (1,) if self.assignment_exists else None

        elif sql.startswith("update users set password_hash"):
            self.password_update = params

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


class ResetAccountPasswordTests(unittest.TestCase):
    def run_reset(self, cursor):
        connection = FakeConnection(cursor)
        current_user = {
            "id": cursor.actor_id,
            "role": cursor.actor_role,
        }
        request = ResetPasswordRequest(password="test-password-123")

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
            result = reset_account_password(
                cursor.target_id,
                request,
                current_user,
            )

        return result, connection

    def test_admin_can_reset_manager_password(self):
        cursor = FakeCursor(
            actor_role="admin",
            target_role="building_manager",
        )

        result, connection = self.run_reset(cursor)

        self.assertEqual(result["id"], cursor.target_id)
        self.assertEqual(
            cursor.password_update,
            ("hashed-test-password", str(cursor.target_id)),
        )
        self.assertIsNotNone(cursor.audit_params)
        self.assertEqual(cursor.audit_params[1], "account_password_reset")
        self.assertTrue(connection.committed)

    def test_admin_can_reset_resident_password(self):
        cursor = FakeCursor(
            actor_role="admin",
            target_role="resident",
        )

        result, connection = self.run_reset(cursor)

        self.assertEqual(result["id"], cursor.target_id)
        self.assertIsNotNone(cursor.password_update)
        self.assertTrue(connection.committed)

    def test_manager_can_reset_resident_in_own_building(self):
        cursor = FakeCursor(
            actor_role="building_manager",
            target_role="resident",
            assignment_exists=True,
        )

        self.run_reset(cursor)

        self.assertIsNotNone(cursor.password_update)

    def test_manager_cannot_reset_resident_in_another_building(self):
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
        request = ResetPasswordRequest(password="test-password-123")

        with (
            patch("services.residents.get_connection", return_value=connection),
            patch("services.residents.hash_password", return_value="hashed"),
        ):
            with self.assertRaises(HTTPException) as error:
                reset_account_password(
                    cursor.target_id,
                    request,
                    current_user,
                )

        self.assertEqual(error.exception.status_code, 403)
        self.assertIsNone(cursor.password_update)
        self.assertTrue(connection.rolled_back)

    def test_manager_cannot_reset_another_manager(self):
        cursor = FakeCursor(
            actor_role="building_manager",
            target_role="building_manager",
        )
        connection = FakeConnection(cursor)
        current_user = {
            "id": cursor.actor_id,
            "role": "building_manager",
        }
        request = ResetPasswordRequest(password="test-password-123")

        with (
            patch("services.residents.get_connection", return_value=connection),
            patch("services.residents.hash_password", return_value="hashed"),
        ):
            with self.assertRaises(HTTPException) as error:
                reset_account_password(
                    cursor.target_id,
                    request,
                    current_user,
                )

        self.assertEqual(error.exception.status_code, 403)
        self.assertIsNone(cursor.password_update)
        self.assertTrue(connection.rolled_back)

    def test_admin_cannot_reset_another_admin(self):
        cursor = FakeCursor(
            actor_role="admin",
            target_role="admin",
        )
        connection = FakeConnection(cursor)
        current_user = {
            "id": cursor.actor_id,
            "role": "admin",
        }
        request = ResetPasswordRequest(password="test-password-123")

        with (
            patch("services.residents.get_connection", return_value=connection),
            patch("services.residents.hash_password", return_value="hashed"),
        ):
            with self.assertRaises(HTTPException) as error:
                reset_account_password(
                    cursor.target_id,
                    request,
                    current_user,
                )

        self.assertEqual(error.exception.status_code, 403)
        self.assertIsNone(cursor.password_update)

    def test_inactive_actor_cannot_reset_password(self):
        cursor = FakeCursor(
            actor_role="admin",
            actor_active=False,
        )
        connection = FakeConnection(cursor)
        current_user = {
            "id": cursor.actor_id,
            "role": "admin",
        }
        request = ResetPasswordRequest(password="test-password-123")

        with (
            patch("services.residents.get_connection", return_value=connection),
            patch("services.residents.hash_password", return_value="hashed"),
        ):
            with self.assertRaises(HTTPException) as error:
                reset_account_password(
                    cursor.target_id,
                    request,
                    current_user,
                )

        self.assertEqual(error.exception.status_code, 401)
        self.assertFalse(cursor.target_was_checked)

    def test_inactive_target_cannot_be_reset(self):
        cursor = FakeCursor(
            actor_role="admin",
            target_active=False,
        )
        connection = FakeConnection(cursor)
        current_user = {
            "id": cursor.actor_id,
            "role": "admin",
        }
        request = ResetPasswordRequest(password="test-password-123")

        with (
            patch("services.residents.get_connection", return_value=connection),
            patch("services.residents.hash_password", return_value="hashed"),
        ):
            with self.assertRaises(HTTPException) as error:
                reset_account_password(
                    cursor.target_id,
                    request,
                    current_user,
                )

        self.assertEqual(error.exception.status_code, 404)
        self.assertIsNone(cursor.password_update)

    def test_audit_failure_rolls_back_password_update(self):
        cursor = FakeCursor(
            actor_role="admin",
            target_role="building_manager",
            fail_on_audit=True,
        )
        connection = FakeConnection(cursor)
        current_user = {
            "id": cursor.actor_id,
            "role": "admin",
        }
        request = ResetPasswordRequest(password="test-password-123")

        with (
            patch("services.residents.get_connection", return_value=connection),
            patch("services.residents.hash_password", return_value="hashed"),
        ):
            with self.assertRaises(RuntimeError):
                reset_account_password(
                    cursor.target_id,
                    request,
                    current_user,
                )

        self.assertIsNotNone(cursor.password_update)
        self.assertTrue(connection.rolled_back)
        self.assertFalse(connection.committed)


if __name__ == "__main__":
    unittest.main(verbosity=2)