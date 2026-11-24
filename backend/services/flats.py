from uuid import UUID

from fastapi import HTTPException
from psycopg.errors import UniqueViolation

from database import get_connection


def _format_flat(row):
    return {
        "id": str(row[0]),
        "building_id": str(row[1]),
        "flat_number": row[2],
        "floor_number": row[3],
    }


def _get_accessible_building(cur, building_id, current_user):
    if current_user["role"] == "admin":
        cur.execute(
            """
            SELECT total_floors
            FROM buildings
            WHERE id = %s
            """,
            (building_id,),
        )

    elif current_user["role"] == "building_manager":
        cur.execute(
            """
            SELECT b.total_floors
            FROM buildings b
            JOIN building_manager_assignments a
              ON a.building_id = b.id
            WHERE b.id = %s
              AND a.manager_id = %s
              AND a.assigned_from <= CURRENT_DATE
              AND a.assigned_until IS NULL
              AND b.status = 'active'
            """,
            (building_id, current_user["id"]),
        )

    else:
        raise HTTPException(
            status_code=403,
            detail="You cannot access flat management.",
        )

    row = cur.fetchone()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Building not found or access denied.",
        )

    return row[0]


def list_flats(current_user, building_id=None):
    with get_connection() as conn:
        with conn.cursor() as cur:

            if current_user["role"] == "admin":
                if building_id:
                    cur.execute(
                        """
                        SELECT id, building_id, flat_number, floor_number
                        FROM flats
                        WHERE building_id = %s
                        ORDER BY floor_number, flat_number
                        """,
                        (building_id,),
                    )
                else:
                    cur.execute(
                        """
                        SELECT id, building_id, flat_number, floor_number
                        FROM flats
                        ORDER BY building_id, floor_number, flat_number
                        """
                    )

            elif current_user["role"] == "building_manager":
                cur.execute(
                    """
                    SELECT f.id, f.building_id,
                           f.flat_number, f.floor_number
                    FROM flats f
                    JOIN buildings b ON b.id = f.building_id
                    JOIN building_manager_assignments a
                      ON a.building_id = b.id
                    WHERE a.manager_id = %s
                      AND a.assigned_from <= CURRENT_DATE
                      AND a.assigned_until IS NULL
                      AND b.status = 'active'
                      AND (%s IS NULL OR f.building_id = %s)
                    ORDER BY f.floor_number, f.flat_number
                    """,
                    (
                        current_user["id"],
                        building_id,
                        building_id,
                    ),
                )

            else:
                raise HTTPException(
                    status_code=403,
                    detail="Residents cannot access flat management.",
                )

            rows = cur.fetchall()

    return [_format_flat(row) for row in rows]


def get_flat(flat_id: UUID, current_user):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, building_id, flat_number, floor_number
                FROM flats
                WHERE id = %s
                """,
                (flat_id,),
            )
            row = cur.fetchone()

            if row is None:
                raise HTTPException(
                    status_code=404,
                    detail="Flat not found.",
                )

            _get_accessible_building(
                cur,
                row[1],
                current_user,
            )

    return _format_flat(row)


def create_flat(request, current_user):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                total_floors = _get_accessible_building(
                    cur,
                    request.building_id,
                    current_user,
                )

                if request.floor_number >= total_floors:
                    raise HTTPException(
                        status_code=400,
                        detail="Floor number exceeds the building's floor range.",
                    )

                cur.execute(
                    """
                    INSERT INTO flats (
                        building_id, flat_number, floor_number
                    )
                    VALUES (%s, %s, %s)
                    RETURNING id, building_id, flat_number, floor_number
                    """,
                    (
                        request.building_id,
                        request.flat_number,
                        request.floor_number,
                    ),
                )

                row = cur.fetchone()

    except UniqueViolation:
        raise HTTPException(
            status_code=409,
            detail="This flat number already exists in the building.",
        )

    return _format_flat(row)


def update_flat(flat_id: UUID, request, current_user):
    changes = request.model_dump(exclude_unset=True)

    if not changes:
        raise HTTPException(
            status_code=400,
            detail="No flat fields were provided.",
        )

    allowed_fields = {"flat_number", "floor_number"}

    if any(field not in allowed_fields for field in changes):
        raise HTTPException(
            status_code=400,
            detail="Invalid flat fields.",
        )

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT building_id FROM flats WHERE id = %s",
                    (flat_id,),
                )
                existing = cur.fetchone()

                if existing is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Flat not found.",
                    )

                building_id = existing[0]

                total_floors = _get_accessible_building(
                    cur,
                    building_id,
                    current_user,
                )

                if (
                    "floor_number" in changes
                    and changes["floor_number"] >= total_floors
                ):
                    raise HTTPException(
                        status_code=400,
                        detail="Floor number exceeds the building's floor range.",
                    )

                fields = list(changes.keys())
                assignments = ", ".join(
                    f"{field} = %s" for field in fields
                )

                cur.execute(
                    f"""
                    UPDATE flats
                    SET {assignments}
                    WHERE id = %s
                    RETURNING id, building_id, flat_number, floor_number
                    """,
                    (*changes.values(), flat_id),
                )

                row = cur.fetchone()

    except UniqueViolation:
        raise HTTPException(
            status_code=409,
            detail="This flat number already exists in the building.",
        )

    return _format_flat(row)