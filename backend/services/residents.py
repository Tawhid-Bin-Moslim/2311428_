from uuid import UUID

from fastapi import HTTPException
from psycopg.errors import UniqueViolation
from psycopg.types.json import Jsonb

from database import get_connection
from security import hash_password


def _verify_actor(cur, current_user, allowed_roles):
    cur.execute(
        """
        SELECT role, is_active
        FROM users
        WHERE id = %s
        FOR SHARE
        """,
        (current_user["id"],),
    )
    actor = cur.fetchone()

    if actor is None or not actor[1]:
        raise HTTPException(
            status_code=401,
            detail="Your account is inactive or does not exist.",
        )

    if actor[0] not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to perform this action.",
        )

    return actor[0]


def _format_resident(row):
    return {
        "id": row[0],
        "full_name": row[1],
        "email": row[2],
        "role": "resident",
        "is_active": row[3],
        "flat_id": row[4],
        "flat_number": row[5],
        "floor_number": row[6],
        "building_id": row[7],
        "building_name": row[8],
        "occupancy_type": row[9],
        "move_in_date": row[10],
    }


def list_residents(current_user):
    with get_connection() as conn:
        with conn.cursor() as cur:
            role = _verify_actor(
                cur,
                current_user,
                ("admin", "building_manager"),
            )

            base_query = """
                SELECT
                    u.id,
                    u.full_name,
                    u.email,
                    u.is_active,
                    f.id,
                    f.flat_number,
                    f.floor_number,
                    b.id,
                    b.name,
                    o.occupancy_type,
                    o.move_in_date
                FROM users u
                JOIN occupancies o ON o.resident_id = u.id
                JOIN flats f ON f.id = o.flat_id
                JOIN buildings b ON b.id = f.building_id
                WHERE u.role = 'resident'
                  AND u.is_active = TRUE
                  AND o.move_out_date IS NULL
                  AND o.move_in_date <= CURRENT_DATE
            """

            if role == "building_manager":
                cur.execute(
                    base_query
                    + """
                      AND EXISTS (
                          SELECT 1
                          FROM building_manager_assignments a
                          WHERE a.manager_id = %s
                            AND a.building_id = b.id
                            AND a.assigned_from <= CURRENT_DATE
                            AND a.assigned_until IS NULL
                      )
                    ORDER BY f.floor_number, f.flat_number, u.full_name
                    """,
                    (current_user["id"],),
                )
            else:
                cur.execute(
                    base_query
                    + """
                    ORDER BY
                        b.name,
                        f.floor_number,
                        f.flat_number,
                        u.full_name
                    """
                )

            rows = cur.fetchall()

    return [_format_resident(row) for row in rows]


def create_resident(request, current_user):

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                actor_role = _verify_actor(
                    cur,
                    current_user,
                    ("admin", "building_manager"),
                )

                # Managers may only use a flat in their own active building.
                if actor_role == "building_manager":
                    cur.execute(
                        """
                        SELECT f.id, f.flat_number, f.floor_number,
                               b.id, b.name
                        FROM flats f
                        JOIN buildings b ON b.id = f.building_id
                        JOIN building_manager_assignments a
                          ON a.building_id = b.id
                        WHERE f.id = %s
                          AND a.manager_id = %s
                          AND a.assigned_from <= CURRENT_DATE
                          AND a.assigned_until IS NULL
                          AND b.status = 'active'
                        FOR UPDATE OF f, b
                        """,
                        (str(request.flat_id), current_user["id"]),
                    )
                else:
                    cur.execute(
                        """
                        SELECT f.id, f.flat_number, f.floor_number,
                               b.id, b.name
                        FROM flats f
                        JOIN buildings b ON b.id = f.building_id
                        WHERE f.id = %s
                          AND b.status = 'active'
                        FOR UPDATE OF f, b
                        """,
                        (str(request.flat_id),),
                    )

                flat = cur.fetchone()

                if flat is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Flat not found or outside your building access.",
                    )

                password_digest = hash_password(request.password)

                # Create the account.
                cur.execute(
                    """
                    INSERT INTO users (
                        full_name,
                        email,
                        password_hash,
                        role,
                        is_active
                    )
                    VALUES (%s, %s, %s, 'resident', TRUE)
                    RETURNING id
                    """,
                    (
                        request.full_name,
                        request.email,
                        password_digest,
                    ),
                )

                resident_id = cur.fetchone()[0]

                # Create the occupancy in the same transaction.
                cur.execute(
                    """
                    INSERT INTO occupancies (
                        resident_id,
                        flat_id,
                        occupancy_type,
                        move_in_date
                    )
                    VALUES (%s, %s, %s, CURRENT_DATE)
                    RETURNING id, move_in_date
                    """,
                    (
                        resident_id,
                        str(request.flat_id),
                        request.occupancy_type,
                    ),
                )

                occupancy = cur.fetchone()

                # Audit the creation.
                cur.execute(
                    """
                    INSERT INTO audit_logs (
                        user_id, action, entity_type, entity_id, metadata
                    )
                    VALUES (%s, %s, %s, %s, %s)
                    """,
                    (
                        current_user["id"],
                        "resident_account_created",
                        "users",
                        str(resident_id),
                        Jsonb({
                            "email": request.email,
                            "flat_id": str(request.flat_id),
                            "building_id": str(flat[3]),
                            "occupancy_id": str(occupancy[0]),
                            "occupancy_type": request.occupancy_type,
                        }),
                    ),
                )

                result = (
                    resident_id,
                    request.full_name,
                    request.email,
                    True,
                    flat[0],
                    flat[1],
                    flat[2],
                    flat[3],
                    flat[4],
                    request.occupancy_type,
                    occupancy[1],
                )

    except UniqueViolation as exc:
        constraint = getattr(
            getattr(exc, "diag", None),
            "constraint_name",
            None,
        )
        if constraint == "idx_users_email_unique":
            detail = "An account with this email already exists."
        else:
            detail = "A conflicting account or occupancy record exists."

        raise HTTPException(status_code=409, detail=detail) from exc

    return _format_resident(result)


def reset_account_password(user_id: UUID, request, current_user):

    with get_connection() as conn:
        with conn.cursor() as cur:
            actor_role = _verify_actor(
                cur,
                current_user,
                ("admin", "building_manager"),
            )

            cur.execute(
                """
                SELECT role, is_active
                FROM users
                WHERE id = %s
                FOR UPDATE
                """,
                (str(user_id),),
            )
            target = cur.fetchone()

            if target is None or not target[1]:
                raise HTTPException(
                    status_code=404,
                    detail="Active account not found.",
                )

            target_role = target[0]

            if target_role == "resident":
                cur.execute(
                    """
                    SELECT f.building_id
                    FROM occupancies o
                    JOIN flats f ON f.id = o.flat_id
                    WHERE o.resident_id = %s
                      AND o.move_in_date <= CURRENT_DATE
                      AND o.move_out_date IS NULL
                    FOR UPDATE OF o
                    """,
                    (str(user_id),),
                )
                occupancies = cur.fetchall()

                if len(occupancies) != 1:
                    raise HTTPException(
                        status_code=409,
                        detail="Resident must have exactly one active occupancy.",
                    )

                if actor_role == "building_manager":
                    cur.execute(
                        """
                        SELECT 1
                        FROM building_manager_assignments
                        WHERE manager_id = %s
                          AND building_id = %s
                          AND assigned_from <= CURRENT_DATE
                          AND assigned_until IS NULL
                        """,
                        (current_user["id"], occupancies[0][0]),
                    )

                    if cur.fetchone() is None:
                        raise HTTPException(
                            status_code=403,
                            detail="You can only reset Residents in your building.",
                        )

            elif target_role == "building_manager":
                if actor_role != "admin":
                    raise HTTPException(
                        status_code=403,
                        detail="Only Admins can reset Manager passwords.",
                    )
            else:
                raise HTTPException(
                    status_code=403,
                    detail="Only Resident and Manager passwords can be reset here.",
                )

            new_password_hash = hash_password(request.password)

            cur.execute(
                """
                UPDATE users
                SET password_hash = %s
                WHERE id = %s
                """,
                (new_password_hash, str(user_id)),
            )

            cur.execute(
                """
                INSERT INTO audit_logs (
                    user_id, action, entity_type, entity_id, metadata
                )
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    current_user["id"],
                    "account_password_reset",
                    "users",
                    str(user_id),
                    Jsonb({"target_role": target_role}),
                ),
            )

    return {
        "id": user_id,
        "message": "Account password successfully reset.",
    }


def deactivate_resident(user_id: UUID, current_user):
    with get_connection() as conn:
        with conn.cursor() as cur:
            actor_role = _verify_actor(
                cur,
                current_user,
                ("building_manager",),
            )

            if actor_role != "building_manager":
                raise HTTPException(
                    status_code=403,
                    detail="Only Building Managers can deactivate Residents.",
                )

            cur.execute(
                """
                SELECT role, is_active, full_name
                FROM users
                WHERE id = %s
                FOR UPDATE
                """,
                (str(user_id),),
            )
            target = cur.fetchone()

            if target is None or not target[1]:
                raise HTTPException(
                    status_code=404,
                    detail="Active Resident account not found.",
                )

            if target[0] != "resident":
                raise HTTPException(
                    status_code=409,
                    detail="Only Resident accounts can be deactivated.",
                )

            cur.execute(
                """
                SELECT o.id, o.move_in_date, f.building_id
                FROM occupancies o
                JOIN flats f ON f.id = o.flat_id
                WHERE o.resident_id = %s
                  AND o.move_out_date IS NULL
                  AND o.move_in_date <= CURRENT_DATE
                FOR UPDATE OF o
                """,
                (str(user_id),),
            )
            occupancies = cur.fetchall()

            if len(occupancies) != 1:
                raise HTTPException(
                    status_code=409,
                    detail="Resident must have exactly one active occupancy.",
                )

            occupancy = occupancies[0]

            cur.execute(
                """
                SELECT 1
                FROM building_manager_assignments
                WHERE manager_id = %s
                  AND building_id = %s
                  AND assigned_from <= CURRENT_DATE
                  AND assigned_until IS NULL
                """,
                (current_user["id"], occupancy[2]),
            )

            if cur.fetchone() is None:
                raise HTTPException(
                    status_code=403,
                    detail="You can only deactivate Residents in your building.",
                )

            cur.execute(
                """
                UPDATE occupancies
                SET move_out_date = CURRENT_DATE
                WHERE id = %s
                  AND move_out_date IS NULL
                """,
                (occupancy[0],),
            )

            cur.execute(
                """
                UPDATE users
                SET is_active = FALSE
                WHERE id = %s
                """,
                (str(user_id),),
            )

            cur.execute(
                """
                INSERT INTO audit_logs (
                    user_id, action, entity_type, entity_id, metadata
                )
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    current_user["id"],
                    "resident_account_deactivated",
                    "users",
                    str(user_id),
                    Jsonb({
                        "resident_name": target[2],
                        "building_id": str(occupancy[2]),
                        "occupancy_id": str(occupancy[0]),
                    }),
                ),
            )

    return {
        "id": user_id,
        "message": "Resident account deactivated. Historical records were preserved.",
    }