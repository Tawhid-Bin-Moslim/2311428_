
from fastapi import HTTPException

from database import get_connection


def _format_request(result):
    return {
        "id": result[0],
        "title": result[1],
        "description": result[2],
        "location": result[3],
        "priority": result[4],
        "status": result[5],
        "created_at": result[6],
    }


def create_maintenance_request(request, current_user):
    if current_user["role"] != "resident":
        raise HTTPException(
            status_code=403,
            detail="Only residents can create maintenance requests.",
        )

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO maintenance_requests
                    (title, description, location, priority,
                     resident_id, building_id, flat_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id, title, description, location,
                          priority, status, created_at
                """,
                (
                    request.title,
                    request.description,
                    request.location,
                    request.priority,
                    current_user["id"],
                    current_user["building_id"],
                    current_user["flat_id"],
                ),
            )
            result = cur.fetchone()

    return _format_request(result)


def get_maintenance_request(request_id: int, current_user):
    with get_connection() as conn:
        with conn.cursor() as cur:

            if current_user["role"] == "resident":
                cur.execute(
                    """
                    SELECT id, title, description, location,
                           priority, status, created_at
                    FROM maintenance_requests
                    WHERE id = %s AND flat_id = %s
                    """,
                    (request_id, current_user["flat_id"]),
                )

            elif current_user["role"] == "building_manager":
                cur.execute(
                    """
                    SELECT id, title, description, location,
                           priority, status, created_at
                    FROM maintenance_requests
                    WHERE id = %s AND building_id = %s
                    """,
                    (request_id, current_user["building_id"]),
                )

            else:
                cur.execute(
                    """
                    SELECT id, title, description, location,
                           priority, status, created_at
                    FROM maintenance_requests
                    WHERE id = %s
                    """,
                    (request_id,),
                )

            result = cur.fetchone()

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Maintenance request not found",
        )

    return _format_request(result)


def list_maintenance_requests(current_user):
    with get_connection() as conn:
        with conn.cursor() as cur:

            if current_user["role"] == "resident":
                cur.execute(
                    """
                    SELECT id, title, description, location,
                           priority, status, created_at
                    FROM maintenance_requests
                    WHERE flat_id = %s
                    ORDER BY created_at DESC
                    """,
                    (current_user["flat_id"],),
                )

            elif current_user["role"] == "building_manager":
                cur.execute(
                    """
                    SELECT id, title, description, location,
                           priority, status, created_at
                    FROM maintenance_requests
                    WHERE building_id = %s
                    ORDER BY created_at DESC
                    """,
                    (current_user["building_id"],),
                )

            else:
                cur.execute(
                    """
                    SELECT id, title, description, location,
                           priority, status, created_at
                    FROM maintenance_requests
                    ORDER BY created_at DESC
                    """
                )

            rows = cur.fetchall()

    return [_format_request(row) for row in rows]


def update_maintenance_request(request_id: int, request, current_user):
    if current_user["role"] != "building_manager":
        raise HTTPException(
            status_code=403,
            detail="Only building managers can update maintenance status.",
        )

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE maintenance_requests
                SET status = %s
                WHERE id = %s AND building_id = %s
                RETURNING id, title, description, location,
                          priority, status, created_at
                """,
                (
                    request.status,
                    request_id,
                    current_user["building_id"],
                ),
            )
            result = cur.fetchone()

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Maintenance request not found",
        )

    return _format_request(result)


def delete_maintenance_request(request_id: int, current_user):
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=403,
            detail="Only administrators can delete maintenance requests.",
        )

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM maintenance_requests
                WHERE id = %s
                RETURNING id
                """,
                (request_id,),
            )
            result = cur.fetchone()

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Maintenance request not found",
        )

    return {
        "message": "Maintenance request deleted successfully",
        "id": result[0],
    }
