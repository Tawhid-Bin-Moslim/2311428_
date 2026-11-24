from uuid import UUID

from fastapi import HTTPException
from psycopg.errors import UniqueViolation
from psycopg.types.json import Jsonb

from database import get_connection


def _format_occupancy(row):
    return {
        "id": str(row[0]),
        "resident_id": str(row[1]),
        "resident_name": row[2],
        "resident_email": row[3],
        "flat_id": str(row[4]),
        "flat_number": row[5],
        "floor_number": row[6],
        "building_id": str(row[7]),
        "building_name": row[8],
        "occupancy_type": row[9],
        "move_in_date": row[10],
        "move_out_date": row[11],
    }


def _get_occupancy(cur, occupancy_id):
    cur.execute(
        """
        SELECT
            o.id,
            o.resident_id,
            u.full_name,
            u.email,
            o.flat_id,
            f.flat_number,
            f.floor_number,
            b.id,
            b.name,
            o.occupancy_type,
            o.move_in_date,
            o.move_out_date
        FROM occupancies o
        JOIN users u ON u.id = o.resident_id
        JOIN flats f ON f.id = o.flat_id
        JOIN buildings b ON b.id = f.building_id
        WHERE o.id = %s
        """,
        (str(occupancy_id),),
    )

    row = cur.fetchone()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Occupancy record not found.",
        )

    return _format_occupancy(row)


def _require_admin(current_user):
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only Admins can manage occupancy records.",
        )


def list_occupancies(current_user):
    _require_admin(current_user)

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    o.id,
                    o.resident_id,
                    u.full_name,
                    u.email,
                    o.flat_id,
                    f.flat_number,
                    f.floor_number,
                    b.id,
                    b.name,
                    o.occupancy_type,
                    o.move_in_date,
                    o.move_out_date
                FROM occupancies o
                JOIN users u ON u.id = o.resident_id
                JOIN flats f ON f.id = o.flat_id
                JOIN buildings b ON b.id = f.building_id
                ORDER BY
                    b.name,
                    f.floor_number,
                    f.flat_number,
                    u.full_name,
                    o.move_in_date DESC
                """
            )

            rows = cur.fetchall()

    return [_format_occupancy(row) for row in rows]


def get_occupancy(occupancy_id: UUID, current_user):
    _require_admin(current_user)

    with get_connection() as conn:
        with conn.cursor() as cur:
            return _get_occupancy(cur, occupancy_id)


def get_my_occupancies(current_user):
    if current_user["role"] != "resident":
        raise HTTPException(
            status_code=403,
            detail="Only Residents can view their own occupancy records.",
        )

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    o.id,
                    o.resident_id,
                    u.full_name,
                    u.email,
                    o.flat_id,
                    f.flat_number,
                    f.floor_number,
                    b.id,
                    b.name,
                    o.occupancy_type,
                    o.move_in_date,
                    o.move_out_date
                FROM occupancies o
                JOIN users u ON u.id = o.resident_id
                JOIN flats f ON f.id = o.flat_id
                JOIN buildings b ON b.id = f.building_id
                WHERE o.resident_id = %s
                ORDER BY o.move_in_date DESC
                """,
                (current_user["id"],),
            )

            rows = cur.fetchall()

    return [_format_occupancy(row) for row in rows]


def create_occupancy(request, current_user):
    _require_admin(current_user)

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:

                # Use the database date consistently.
                cur.execute("SELECT CURRENT_DATE")
                database_today = cur.fetchone()[0]

                if request.move_in_date > database_today:
                    raise HTTPException(
                        status_code=400,
                        detail="Move-in date cannot be in the future.",
                    )

                # Lock and validate the Resident account.
                cur.execute(
                    """
                    SELECT id, role, is_active
                    FROM users
                    WHERE id = %s
                    FOR UPDATE
                    """,
                    (str(request.resident_id),),
                )

                resident = cur.fetchone()

                if resident is None or not resident[2]:
                    raise HTTPException(
                        status_code=404,
                        detail="Active Resident account not found.",
                    )

                if resident[1] != "resident":
                    raise HTTPException(
                        status_code=409,
                        detail="The selected user is not a Resident.",
                    )

                # Check for an existing open occupancy.
                cur.execute(
                    """
                    SELECT id
                    FROM occupancies
                    WHERE resident_id = %s
                      AND move_out_date IS NULL
                    FOR UPDATE
                    """,
                    (str(request.resident_id),),
                )

                if cur.fetchone() is not None:
                    raise HTTPException(
                        status_code=409,
                        detail="This Resident already has an open occupancy.",
                    )

                # Verify that the selected flat belongs to
                # an active building.
                cur.execute(
                    """
                    SELECT f.id
                    FROM flats f
                    JOIN buildings b ON b.id = f.building_id
                    WHERE f.id = %s
                      AND b.status = 'active'
                    FOR UPDATE OF f, b
                    """,
                    (str(request.flat_id),),
                )

                if cur.fetchone() is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Flat not found or its building is inactive.",
                    )

                # Create the occupancy.
                cur.execute(
                    """
                    INSERT INTO occupancies (
                        resident_id,
                        flat_id,
                        occupancy_type,
                        move_in_date
                    )
                    VALUES (%s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        str(request.resident_id),
                        str(request.flat_id),
                        request.occupancy_type,
                        request.move_in_date,
                    ),
                )

                occupancy_id = cur.fetchone()[0]

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
                        current_user["id"],
                        "resident_assigned_to_flat",
                        "occupancies",
                        str(occupancy_id),
                        Jsonb({
                            "resident_id": str(request.resident_id),
                            "flat_id": str(request.flat_id),
                            "occupancy_type": request.occupancy_type,
                            "move_in_date": request.move_in_date.isoformat(),
                        }),
                    ),
                )

                result = _get_occupancy(cur, occupancy_id)

    except UniqueViolation:
        raise HTTPException(
            status_code=409,
            detail="This Resident already has an open occupancy.",
        )

    return result


def update_occupancy(
    occupancy_id: UUID,
    request,
    current_user,
):
    _require_admin(current_user)

    changes = request.model_dump(exclude_unset=True)

    if not changes:
        raise HTTPException(
            status_code=400,
            detail="No occupancy fields were provided.",
        )

    new_type = changes.get("occupancy_type")

    if new_type not in ("owner", "tenant"):
        raise HTTPException(
            status_code=422,
            detail="Occupancy type must be owner or tenant.",
        )

    with get_connection() as conn:
        with conn.cursor() as cur:

            cur.execute(
                """
                SELECT resident_id, occupancy_type, move_out_date
                FROM occupancies
                WHERE id = %s
                FOR UPDATE
                """,
                (str(occupancy_id),),
            )

            existing = cur.fetchone()

            if existing is None:
                raise HTTPException(
                    status_code=404,
                    detail="Occupancy record not found.",
                )

            if existing[2] is not None:
                raise HTTPException(
                    status_code=409,
                    detail="Historical occupancy records cannot be edited.",
                )

            cur.execute(
                """
                UPDATE occupancies
                SET occupancy_type = %s
                WHERE id = %s
                """,
                (new_type, str(occupancy_id)),
            )

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
                    current_user["id"],
                    "occupancy_type_updated",
                    "occupancies",
                    str(occupancy_id),
                    Jsonb({
                        "resident_id": str(existing[0]),
                        "previous_occupancy_type": existing[1],
                        "new_occupancy_type": new_type,
                    }),
                ),
            )

            result = _get_occupancy(cur, occupancy_id)

    return result


def end_occupancy(occupancy_id: UUID, current_user):
    _require_admin(current_user)

    with get_connection() as conn:
        with conn.cursor() as cur:

            cur.execute(
                """
                SELECT
                    resident_id,
                    move_in_date,
                    move_out_date,
                    CURRENT_DATE
                FROM occupancies
                WHERE id = %s
                FOR UPDATE
                """,
                (str(occupancy_id),),
            )

            existing = cur.fetchone()

            if existing is None:
                raise HTTPException(
                    status_code=404,
                    detail="Occupancy record not found.",
                )

            if existing[2] is not None:
                raise HTTPException(
                    status_code=409,
                    detail="This occupancy has already ended.",
                )

            if existing[1] > existing[3]:
                raise HTTPException(
                    status_code=409,
                    detail="A future occupancy cannot be ended yet.",
                )

            cur.execute(
                """
                UPDATE occupancies
                SET move_out_date = CURRENT_DATE
                WHERE id = %s
                RETURNING move_out_date
                """,
                (str(occupancy_id),),
            )

            move_out_date = cur.fetchone()[0]

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
                    current_user["id"],
                    "occupancy_ended",
                    "occupancies",
                    str(occupancy_id),
                    Jsonb({
                        "resident_id": str(existing[0]),
                        "move_out_date": move_out_date.isoformat(),
                    }),
                ),
            )

            result = _get_occupancy(cur, occupancy_id)

    return result
