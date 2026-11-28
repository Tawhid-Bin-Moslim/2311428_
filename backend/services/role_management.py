from uuid import UUID

from fastapi import HTTPException
from psycopg.types.json import Jsonb

from database import get_connection
from security import hash_password
from psycopg.errors import UniqueViolation
from services.users import _generate_manager_id


def _generate_admin_id(cur) -> str:
    """Generate a unique two-digit Admin login ID."""

    cur.execute("SELECT pg_advisory_xact_lock(2311428, 1001)")

    cur.execute(
        """
        SELECT LPAD(candidate::TEXT, 2, '0')
        FROM generate_series(0, 99) AS ids(candidate)
        WHERE NOT EXISTS (
            SELECT 1
            FROM users
            WHERE login_id = LPAD(candidate::TEXT, 2, '0')
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
            detail="No available two-digit Admin ID remains.",
        )

    return result[0]


def _get_active_occupancy(cur, user_id):
    """Lock and return the Resident's current occupancy."""

    cur.execute(
        """
        SELECT o.id, o.flat_id, f.building_id
        FROM occupancies o
        JOIN flats f ON f.id = o.flat_id
        WHERE o.resident_id = %s
          AND o.move_in_date <= CURRENT_DATE
          AND o.move_out_date IS NULL
        FOR UPDATE OF o
        """,
        (user_id,),
    )

    rows = cur.fetchall()

    if len(rows) != 1:
        raise HTTPException(
            status_code=409,
            detail="Resident must have exactly one active occupancy.",
        )

    return rows[0]


def _end_resident_occupancy(cur, occupancy_id):
    cur.execute(
        """
        UPDATE occupancies
        SET move_out_date = CURRENT_DATE
        WHERE id = %s
          AND move_out_date IS NULL
        """,
        (occupancy_id,),
    )


def _get_active_assignment(cur, user_id):
    """Lock and return the Manager's current building assignment."""

    cur.execute(
        """
        SELECT id, building_id
        FROM building_manager_assignments
        WHERE manager_id = %s
          AND assigned_from <= CURRENT_DATE
          AND assigned_until IS NULL
        FOR UPDATE
        """,
        (user_id,),
    )

    rows = cur.fetchall()

    if len(rows) != 1:
        raise HTTPException(
            status_code=409,
            detail="Manager must have exactly one active building assignment.",
        )

    return rows[0]


def _end_manager_assignment(cur, assignment_id):
    cur.execute(
        """
        UPDATE building_manager_assignments
        SET assigned_until = CURRENT_DATE
        WHERE id = %s
          AND assigned_until IS NULL
        """,
        (assignment_id,),
    )


def _ensure_no_open_occupancy(cur, user_id):
    cur.execute(
        """
        SELECT id
        FROM occupancies
        WHERE resident_id = %s
          AND move_out_date IS NULL
        FOR UPDATE
        """,
        (user_id,),
    )

    if cur.fetchone() is not None:
        raise HTTPException(
            status_code=409,
            detail="This account still has an open occupancy record.",
        )


def _ensure_no_open_assignment(cur, user_id):
    cur.execute(
        """
        SELECT id
        FROM building_manager_assignments
        WHERE manager_id = %s
          AND assigned_until IS NULL
        FOR UPDATE
        """,
        (user_id,),
    )

    if cur.fetchone() is not None:
        raise HTTPException(
            status_code=409,
            detail="This account still has an open Manager assignment.",
        )


def _validate_building(cur, building_id):
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


def _validate_flat(cur, flat_id, expected_building_id=None):
    cur.execute(
        """
        SELECT f.id, f.building_id
        FROM flats f
        JOIN buildings b ON b.id = f.building_id
        WHERE f.id = %s
          AND b.status = 'active'
        FOR UPDATE OF f, b
        """,
        (str(flat_id),),
    )

    flat = cur.fetchone()

    if flat is None:
        raise HTTPException(
            status_code=404,
            detail="Flat not found or its building is inactive.",
        )

    if (
        expected_building_id is not None
        and str(flat[1]) != str(expected_building_id)
    ):
        raise HTTPException(
            status_code=400,
            detail="Selected flat must belong to the Manager's assigned building.",
        )

    return flat


def change_user_role(user_id: UUID, request, current_user: dict):
    """
    Change an Admin, Building Manager, or Resident role.

    Only Admins can perform role changes.
    Only the Super Admin can manage Admin accounts.
    Super Admin accounts cannot be modified.
    """

    target_id = str(user_id)
    actor_id = str(current_user["id"])
    new_role = request.role

    if actor_id == target_id:
        raise HTTPException(
            status_code=409,
            detail="You cannot change your own role.",
        )

    with get_connection() as conn:
        with conn.cursor() as cur:

            # Recheck the actor's current database permissions.
            cur.execute(
                """
                SELECT role, is_active, is_super_admin
                FROM users
                WHERE id = %s
                FOR SHARE
                """,
                (actor_id,),
            )

            actor = cur.fetchone()

            if actor is None or not actor[1]:
                raise HTTPException(
                    status_code=401,
                    detail="Your account is inactive or does not exist.",
                )

            if actor[0] != "admin":
                raise HTTPException(
                    status_code=403,
                    detail="Only Admins can change user roles.",
                )

            actor_is_super_admin = bool(actor[2])

            # Lock the target account.
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
                WHERE id = %s
                FOR UPDATE
                """,
                (target_id,),
            )

            user = cur.fetchone()

            if user is None or not user[5]:
                raise HTTPException(
                    status_code=404,
                    detail="Active user account not found.",
                )

            previous_role = user[3]
            previous_login_id = user[4]

            if bool(user[6]):
                raise HTTPException(
                    status_code=403,
                    detail="The Super Admin account is protected.",
                )

            if previous_role == new_role:
                raise HTTPException(
                    status_code=409,
                    detail="The user already has this role.",
                )

            # Admin accounts can only be managed by Super Admin.
            if (
                previous_role == "admin" or new_role == "admin"
            ) and not actor_is_super_admin:
                raise HTTPException(
                    status_code=403,
                    detail="Only the Super Admin can manage Admin accounts.",
                )

            building_id = None
            flat_id = None
            occupancy_type = request.occupancy_type
            new_login_id = None

            # A Resident must leave their current flat before
            # becoming a Manager or Admin.
            if previous_role == "resident":
                occupancy = _get_active_occupancy(cur, target_id)

                # A Resident must not retain an open Manager assignment.
                _ensure_no_open_assignment(cur, target_id)

                if new_role in ("building_manager", "admin"):
                    _end_resident_occupancy(cur, occupancy[0])
                    flat_id = str(occupancy[1])
                    building_id = str(occupancy[2])

            # A Manager must end their current building assignment
            # before becoming a Resident or Admin.
            elif previous_role == "building_manager":
                assignment = _get_active_assignment(cur, target_id)

                # A Manager must not retain an open Resident occupancy.
                _ensure_no_open_occupancy(cur, target_id)

                if new_role in ("resident", "admin"):
                    _end_manager_assignment(cur, assignment[0])
                    building_id = str(assignment[1])

            # Existing Admins should not retain active Resident
            # occupancy or Manager assignment records.
            elif previous_role == "admin":
                _ensure_no_open_occupancy(cur, target_id)
                _ensure_no_open_assignment(cur, target_id)

            # Determine the data needed for the new role.
            if new_role == "admin":
                new_login_id = _generate_admin_id(cur)

            elif new_role == "building_manager":
                building_id = str(request.building_id)

                _validate_building(cur, building_id)

                new_login_id = _generate_manager_id(cur)

            elif new_role == "resident":
                flat = _validate_flat(
                    cur,
                    request.flat_id,
                    expected_building_id=(
                        building_id
                        if previous_role == "building_manager"
                        else None
                    ),
                )

                if previous_role == "admin":
                    flat_id = str(flat[0])
                    building_id = str(flat[1])

                else:
                    flat_id = str(flat[0])
                    building_id = str(flat[1])

            # Change the existing account while keeping its UUID
            # and password hash.
            cur.execute(
                """
                UPDATE users
                SET role = %s,
                    login_id = %s
                WHERE id = %s
                """,
                (new_role, new_login_id, target_id),
            )

            # A new Manager needs an active building assignment.
            if new_role == "building_manager":
                cur.execute(
                    """
                    INSERT INTO building_manager_assignments (
                        manager_id,
                        building_id,
                        assigned_from
                    )
                    VALUES (%s, %s, CURRENT_DATE)
                    """,
                    (target_id, building_id),
                )

            # A new Resident needs an active flat occupancy.
            elif new_role == "resident":
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
                    (target_id, flat_id, occupancy_type),
                )

            # Record the role change.
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
                    actor_id,
                    "user_role_changed",
                    "users",
                    target_id,
                    Jsonb({
                        "previous_role": previous_role,
                        "new_role": new_role,
                        "previous_login_id": previous_login_id,
                        "new_login_id": new_login_id,
                        "building_id": building_id,
                        "flat_id": flat_id,
                        "occupancy_type": occupancy_type,
                    }),
                ),
            )

    return {
        "id": user[0],
        "full_name": user[1],
        "email": user[2],
        "role": new_role,
        "login_id": new_login_id,
        "message": (
            f"User role successfully changed from "
            f"{previous_role} to {new_role}."
        ),
    }

def create_admin_account(request, current_user: dict):
    """
    Create a new Administrator account.
    Only an active Super Admin can create an Administrator.
    """

    actor_id = str(current_user["id"])

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:

                # Verify the creator's current database permissions.
                cur.execute(
                    """
                    SELECT role, is_active, is_super_admin
                    FROM users
                    WHERE id = %s
                    FOR SHARE
                    """,
                    (actor_id,),
                )

                actor = cur.fetchone()

                if actor is None or not actor[1]:
                    raise HTTPException(
                        status_code=401,
                        detail="Your account is inactive or does not exist.",
                    )

                if actor[0] != "admin" or not bool(actor[2]):
                    raise HTTPException(
                        status_code=403,
                        detail="Only the Super Admin can create Administrator accounts.",
                    )

                # Generate an available two-digit Admin Login ID.
                # This uses the same advisory lock as role transitions.
                login_id = _generate_admin_id(cur)

                # Hash the password before storing it.
                password_digest = hash_password(request.password)

                # Create a normal Admin, never a Super Admin.
                cur.execute(
                    """
                    INSERT INTO users (
                        login_id,
                        full_name,
                        email,
                        password_hash,
                        role,
                        is_active,
                        is_super_admin
                    )
                    VALUES (%s, %s, %s, %s, 'admin', TRUE, FALSE)
                    RETURNING id, full_name, email, role, login_id
                    """,
                    (
                        login_id,
                        request.full_name,
                        request.email,
                        password_digest,
                    ),
                )

                created_user = cur.fetchone()

                # Record the action in the same transaction.
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
                        actor_id,
                        "admin_account_created",
                        "users",
                        str(created_user[0]),
                        Jsonb({
                            "created_email": created_user[2],
                            "login_id": created_user[4],
                            "role": "admin",
                            "is_super_admin": False,
                        }),
                    ),
                )

    except UniqueViolation as exc:
        constraint_name = getattr(
            getattr(exc, "diag", None),
            "constraint_name",
            None,
        )

        if constraint_name == "idx_users_email_unique":
            detail = "An account with this email already exists."
        elif constraint_name == "idx_users_login_id_unique":
            detail = "The generated Admin Login ID is already in use. Please try again."
        else:
            detail = "An account identifier conflict occurred."

        raise HTTPException(
            status_code=409,
            detail=detail,
        ) from exc

    return {
        "id": created_user[0],
        "full_name": created_user[1],
        "email": created_user[2],
        "role": created_user[3],
        "login_id": created_user[4],
        "message": "Administrator account successfully created.",
    }
