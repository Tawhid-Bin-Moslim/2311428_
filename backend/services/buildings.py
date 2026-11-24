
from uuid import UUID

from fastapi import HTTPException
from psycopg.errors import UniqueViolation

from database import get_connection


def _format_building(row):
    return {
        "id": str(row[0]),
        "building_code": row[1],
        "name": row[2],
        "address": row[3],
        "total_floors": row[4],
        "total_flats": row[5],
        "contact_phone": row[6],
        "status": row[7],
    }


def list_buildings(current_user):
    with get_connection() as conn:
        with conn.cursor() as cur:
            if current_user["role"] == "admin":
                cur.execute(
                    """
                    SELECT id, building_code, name, address,
                           total_floors, total_flats,
                           contact_phone, status
                    FROM buildings
                    ORDER BY created_at DESC
                    """
                )

            elif current_user["role"] == "building_manager":
                cur.execute(
                    """
                    SELECT b.id, b.building_code, b.name, b.address,
                           b.total_floors, b.total_flats,
                           b.contact_phone, b.status
                    FROM buildings b
                    JOIN building_manager_assignments a
                      ON a.building_id = b.id
                    WHERE a.manager_id = %s
                      AND a.assigned_from <= CURRENT_DATE
                      AND a.assigned_until IS NULL
                      AND b.status = 'active'
                    ORDER BY b.created_at DESC
                    """,
                    (current_user["id"],),
                )

            else:
                raise HTTPException(
                    status_code=403,
                    detail="Residents cannot access building management.",
                )

            rows = cur.fetchall()

    return [_format_building(row) for row in rows]


def get_building(building_id: UUID, current_user):
    with get_connection() as conn:
        with conn.cursor() as cur:
            if current_user["role"] == "admin":
                cur.execute(
                    """
                    SELECT id, building_code, name, address,
                           total_floors, total_flats,
                           contact_phone, status
                    FROM buildings
                    WHERE id = %s
                    """,
                    (building_id,),
                )

            elif current_user["role"] == "building_manager":
                cur.execute(
                    """
                    SELECT b.id, b.building_code, b.name, b.address,
                           b.total_floors, b.total_flats,
                           b.contact_phone, b.status
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
                    detail="You cannot access building details.",
                )

            row = cur.fetchone()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Building not found.",
        )

    return _format_building(row)


def create_building(request, current_user):
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only administrators can create buildings.",
        )

    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO buildings (
                        building_code, name, address,
                        total_floors, total_flats, contact_phone
                    )
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, building_code, name, address,
                              total_floors, total_flats,
                              contact_phone, status
                    """,
                    (
                        request.building_code,
                        request.name,
                        request.address,
                        request.total_floors,
                        request.total_flats,
                        request.contact_phone,
                    ),
                )
                row = cur.fetchone()

    except UniqueViolation:
        raise HTTPException(
            status_code=409,
            detail="A building with this code already exists.",
        )

    return _format_building(row)


def update_building(building_id: UUID, request, current_user):
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only administrators can update buildings.",
        )

    changes = request.model_dump(exclude_unset=True)

    if not changes:
        raise HTTPException(
            status_code=400,
            detail="No building fields were provided.",
        )

    allowed_fields = {
        "name",
        "address",
        "total_floors",
        "total_flats",
        "contact_phone",
        "status",
    }

    if any(field not in allowed_fields for field in changes):
        raise HTTPException(
            status_code=400,
            detail="Invalid building fields.",
        )

    fields = list(changes.keys())
    assignments = ", ".join(f"{field} = %s" for field in fields)
    values = list(changes.values())

    query = f"""
        UPDATE buildings
        SET {assignments}
        WHERE id = %s
        RETURNING id, building_code, name, address,
                  total_floors, total_flats,
                  contact_phone, status
    """

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (*values, building_id))
            row = cur.fetchone()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Building not found.",
        )

    return _format_building(row)
