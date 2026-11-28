import unittest
from uuid import uuid4
from unittest.mock import patch

from services.flats import list_flats
from services.users import list_users


class FakeCursor:
    def __init__(self, rows):
        self.rows = rows
        self.query = None
        self.params = None

    def execute(self, query, params=None):
        self.query = query
        self.params = params

    def fetchall(self):
        return self.rows


class FakeCursorContext:
    def __init__(self, cursor):
        self.cursor = cursor

    def __enter__(self):
        return self.cursor

    def __exit__(self, exc_type, exc_value, traceback):
        return False


class FakeConnection:
    def __init__(self, cursor):
        self.cursor_instance = cursor

    def cursor(self):
        return FakeCursorContext(self.cursor_instance)


class FakeConnectionContext:
    def __init__(self, cursor):
        self.connection = FakeConnection(cursor)

    def __enter__(self):
        return self.connection

    def __exit__(self, exc_type, exc_value, traceback):
        return False


class ResidentAccessListTests(unittest.TestCase):

    @patch("services.flats.get_connection")
    def test_manager_lists_assigned_building_flats_without_filter(
        self, mock_connection
    ):
        manager_id = str(uuid4())
        building_id = uuid4()
        flat_id = uuid4()

        cursor = FakeCursor([
            (flat_id, building_id, "A-101", 1),
        ])
        mock_connection.return_value = FakeConnectionContext(cursor)

        result = list_flats({
            "id": manager_id,
            "role": "building_manager",
        })

        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["id"], str(flat_id))
        self.assertEqual(result[0]["building_id"], str(building_id))

        sql = " ".join(cursor.query.split())

        self.assertIn("a.manager_id = %s", sql)
        self.assertIn("a.assigned_from <= CURRENT_DATE", sql)
        self.assertIn("a.assigned_until IS NULL", sql)
        self.assertIn("b.status = 'active'", sql)
        self.assertNotIn("f.building_id = %s", sql)
        self.assertEqual(cursor.params, [manager_id])

    @patch("services.flats.get_connection")
    def test_manager_optional_building_filter_is_applied(
        self, mock_connection
    ):
        manager_id = str(uuid4())
        building_id = uuid4()

        cursor = FakeCursor([])
        mock_connection.return_value = FakeConnectionContext(cursor)

        result = list_flats(
            {
                "id": manager_id,
                "role": "building_manager",
            },
            building_id=building_id,
        )

        self.assertEqual(result, [])

        sql = " ".join(cursor.query.split())

        self.assertIn("a.manager_id = %s", sql)
        self.assertIn("f.building_id = %s", sql)
        self.assertEqual(cursor.params, [manager_id, building_id])

    @patch("services.users.get_connection")
    def test_admin_user_list_includes_manager_assigned_building(
        self, mock_connection
    ):
        manager_id = uuid4()
        building_id = uuid4()
        unassigned_manager_id = uuid4()

        cursor = FakeCursor([
            (
                manager_id,
                "Manager One",
                "manager@example.com",
                "building_manager",
                "1234",
                True,
                False,
                building_id,
                "Tower A",
            ),
            (
                unassigned_manager_id,
                "Manager Two",
                "manager2@example.com",
                "building_manager",
                "1235",
                True,
                False,
                None,
                None,
            ),
        ])
        mock_connection.return_value = FakeConnectionContext(cursor)

        result = list_users()

        self.assertEqual(len(result), 2)
        self.assertEqual(result[0]["assigned_building_id"], building_id)
        self.assertEqual(result[0]["assigned_building_name"], "Tower A")
        self.assertIsNone(result[1]["assigned_building_id"])
        self.assertIsNone(result[1]["assigned_building_name"])

        sql = " ".join(cursor.query.split())

        self.assertIn("LEFT JOIN LATERAL", sql)
        self.assertIn("building_manager_assignments", sql)
        self.assertIn("a.manager_id = u.id", sql)
        self.assertIn("a.assigned_until IS NULL", sql)


if __name__ == "__main__":
    unittest.main()
