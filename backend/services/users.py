
from uuid import UUID

from fastapi import HTTPException
from psycopg.types.json import Jsonb

from database import get_connection


def list_users():
    """Return user accounts without exposing password hashes."""

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    full_name,
                    email,
                    role,
                    login_id,
                    is_active,
                    is_super_admin
                FROM users
                ORDER BY
                    CASE role
                        WHEN 'admin' THEN 1
                        WHEN 'building_manager' THEN 2
                        WHEN 'resident' THEN 3
                    END,
                    full_name
                """
            )

            rows = cur.fetchall()

    return [
        {
            "id": row[0],
            "full_name": row[1],
            "email": row[2],
            "role": row[3],
            "login_id": row[4],
            "is_active": row[5],
            "is_super_admin": row[6],
        }
        for row in rows
    ]


def _generate_manager_id(cur) -> str:
    """
    Allocate an unused four-digit Manager ID.

    A transaction-level advisory lock prevents concurrent
    promotions from selecting the same available ID.
    """

    cur.execute("SELECT pg_advisory_xact_lock(2311428, 1001)")

    cur.execute(
        """
        SELECT candidate::TEXT
        FROM generate_series(1000, 9999) AS ids(candidate)
        WHERE NOT EXISTS (
            SELECT 1
            FROM users
            WHERE login_id = candidate::TEXT
              AND role IN ('admin', 'building_manager')
        )
        ORDER BY candidate
        LIMIT 1
        """
    )

    result = cur.fetchone()

    if result is None:
        raise HTTPException(
            status_code=409,
            detail="No available four-digit Manager ID remains.",
        )

    return result[0]


def promote_resident(user_id: UUID, building_id: UUID, admin: dict):
    """Promote a Resident to Building Manager."""

    with get_connection() as conn:
        with conn.cursor() as cur:

            # Lock the target account.
            cur.execute(
                """
                SELECT id, full_name, email, role, is_active
                FROM users
                WHERE id = %s
                FOR UPDATE
                """,
                (str(user_id),),
            )

            user = cur.fetchone()

            if user is None or not user[4]:
                raise HTTPException(
                    status_code=404,
                    detail="Active user account not found.",
                )

            if user[3] != "resident":
                raise HTTPException(
                    status_code=409,
                    detail="Only Residents can be promoted.",
                )

            # Verify the Resident's active occupancy.
            cur.execute(
                """
                SELECT id, flat_id
                FROM occupancies
                WHERE resident_id = %s
                  AND move_in_date <= CURRENT_DATE
                  AND move_out_date IS NULL
                FOR UPDATE
                """,
                (str(user_id),),
            )

            occupancy = cur.fetchall()

            if len(occupancy) != 1:
                raise HTTPException(
                    status_code=409,
                    detail="Resident must have exactly one active occupancy.",
                )

            # Lock the selected building.
            cur.execute(
                """
                SELECT id
                FROM buildings
                WHERE id = %s
                  AND status = 'active'
                FOR UPDATE
                """,
                (str(building_id),),
            )

            if cur.fetchone() is None:
                raise HTTPException(
                    status_code=404,
                    detail="Active building not found.",
                )

            # Check whether the building already has
            # an active or future assignment.
            cur.execute(
                """
                SELECT id
                FROM building_manager_assignments
                WHERE building_id = %s
                  AND assigned_until IS NULL
                """,
                (str(building_id),),
            )

            if cur.fetchone() is not None:
                raise HTTPException(
                    status_code=409,
                    detail="This building already has a Manager assignment.",
                )

            # Allocate a unique Manager ID.
            manager_id = _generate_manager_id(cur)

            # End the Resident's occupancy.
            cur.execute(
                """
                UPDATE occupancies
                SET move_out_date = CURRENT_DATE
                WHERE id = %s
                  AND move_out_date IS NULL
                """,
                (occupancy[0][0],),
            )

            # Update the existing account.
            cur.execute(
                """
                UPDATE users
                SET role = 'building_manager',
                    login_id = %s
                WHERE id = %s
                """,
                (manager_id, str(user_id)),
            )

            # Assign the Manager to the selected building.
            cur.execute(
                """
                INSERT INTO building_manager_assignments (
                    manager_id,
                    building_id,
                    assigned_from
                )
                VALUES (%s, %s, CURRENT_DATE)
                """,
                (str(user_id), str(building_id)),
            )

            # Record the Admin's action.
            cur.execute(
                """
                INSERT INTO audit_logs (
                    user_id,
                    action,
                    entity_type,
                    entity_id,
                    metadata
                )
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    admin["id"],
                    "resident_promoted_to_manager",
                    "users",
                    str(user_id),
                    Jsonb({
                        "previous_role": "resident",
                        "new_role": "building_manager",
                        "manager_login_id": manager_id,
                        "building_id": str(building_id),
                    }),
                ),
            )

    return {
        "id": user[0],
        "full_name": user[1],
        "email": user[2],
        "role": "building_manager",
        "login_id": manager_id,
        "message": "Resident successfully promoted to Building Manager.",
    }


def demote_manager(
    user_id: UUID,
    flat_id: UUID,
    occupancy_type: str,
    admin: dict,
):
    """Demote a Building Manager to Resident."""

    if occupancy_type not in ("owner", "tenant"):
        raise HTTPException(
            status_code=422,
            detail="Occupancy type must be owner or tenant.",
        )

    with get_connection() as conn:
        with conn.cursor() as cur:

            # Lock the target account.
            cur.execute(
                """
                SELECT id, full_name, email, role, is_active
                FROM users
                WHERE id = %s
                FOR UPDATE
                """,
                (str(user_id),),
            )

            user = cur.fetchone()

            if user is None or not user[4]:
                raise HTTPException(
                    status_code=404,
                    detail="Active user account not found.",
                )

            if user[3] != "building_manager":
                raise HTTPException(
                    status_code=409,
                    detail="Only Building Managers can be demoted.",
                )

            # Find and lock the Manager's active assignment.
            cur.execute(
                """
                SELECT id, building_id
                FROM building_manager_assignments
                WHERE manager_id = %s
                  AND assigned_from <= CURRENT_DATE
                  AND assigned_until IS NULL
                FOR UPDATE
                """,
                (str(user_id),),
            )

            assignments = cur.fetchall()

            if len(assignments) != 1:
                raise HTTPException(
                    status_code=409,
                    detail="Manager must have exactly one active building assignment.",
                )

            assignment_id = assignments[0][0]
            assigned_building_id = assignments[0][1]

            # Verify that the selected flat belongs to
            # the Manager's currently assigned building.
            cur.execute(
                """
                SELECT id
                FROM flats
                WHERE id = %s
                  AND building_id = %s
                FOR UPDATE
                """,
                (str(flat_id), str(assigned_building_id)),
            )

            if cur.fetchone() is None:
                raise HTTPException(
                    status_code=400,
                    detail="Selected flat must belong to the Manager's assigned building.",
                )

            # End the Manager assignment.
            cur.execute(
                """
                UPDATE building_manager_assignments
                SET assigned_until = CURRENT_DATE
                WHERE id = %s
                  AND assigned_until IS NULL
                """,
                (assignment_id,),
            )

            # Change the existing account into a Resident.
            cur.execute(
                """
                UPDATE users
                SET role = 'resident',
                    login_id = NULL
                WHERE id = %s
                """,
                (str(user_id),),
            )

            # Create the new Resident occupancy.
            cur.execute(
                """
                INSERT INTO occupancies (
                    resident_id,
                    flat_id,
                    occupancy_type,
                    move_in_date
                )
                VALUES (%s, %s, %s, CURRENT_DATE)
                """,
                (str(user_id), str(flat_id), occupancy_type),
            )

            # Record the Admin's action.
            cur.execute(
                """
                INSERT INTO audit_logs (
                    user_id,
                    action,
                    entity_type,
                    entity_id,
                    metadata
                )
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    admin["id"],
                    "manager_demoted_to_resident",
                    "users",
                    str(user_id),
                    Jsonb({
                        "previous_role": "building_manager",
                        "new_role": "resident",
                        "building_id": str(assigned_building_id),
                        "flat_id": str(flat_id),
                        "occupancy_type": occupancy_type,
                    }),
                ),
            )

    return {
        "id": user[0],
        "full_name": user[1],
        "email": user[2],
        "role": "resident",
        "login_id": None,
        "message": "Building Manager successfully demoted to Resident.",
    }
