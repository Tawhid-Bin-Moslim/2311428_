
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


def create_maintenance_request(request):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO maintenance_requests
                    (title, description, location, priority)
                VALUES (%s, %s, %s, %s)
                RETURNING id, title, description, location,
                          priority, status, created_at
                """,
                (
                    request.title,
                    request.description,
                    request.location,
                    request.priority,
                ),
            )
            result = cur.fetchone()

    return _format_request(result)


def get_maintenance_request(request_id: int):
    with get_connection() as conn:
        with conn.cursor() as cur:
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


def list_maintenance_requests():
    with get_connection() as conn:
        with conn.cursor() as cur:
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


def update_maintenance_request(request_id: int, request):
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE maintenance_requests
                SET status = %s
                WHERE id = %s
                RETURNING id, title, description, location,
                          priority, status, created_at
                """,
                (request.status, request_id),
            )
            result = cur.fetchone()

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Maintenance request not found",
        )

    return _format_request(result)


def delete_maintenance_request(request_id: int):
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
 