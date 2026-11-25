
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException

from database import get_connection


def _format_announcement(row):
    return {
        "id": row[0],
        "building_id": row[1],
        "created_by": row[2],
        "created_by_name": row[3],
        "title": row[4],
        "description": row[5],
        "category": row[6],
        "status": row[7],
        "published_at": row[8],
        "expires_at": row[9],
        "created_at": row[10],
    }


SELECT_ANNOUNCEMENT = """
    SELECT
        a.id,
        a.building_id,
        a.created_by,
        u.full_name,
        a.title,
        a.description,
        a.category,
        a.status,
        a.published_at,
        a.expires_at,
        a.created_at
    FROM announcements a
    JOIN users u ON u.id = a.created_by
"""


def _write_audit_log(cur, user_id, action, announcement_id, metadata=None):
    import json

    cur.execute(
        """
        INSERT INTO audit_logs
            (user_id, action, entity_type, entity_id, metadata)
        VALUES (%s, %s, %s, %s, %s::jsonb)
        """,
        (
            user_id,
            action,
            "announcement",
            str(announcement_id),
            json.dumps(metadata or {}),
        ),
    )


def _get_manager_building(cur, current_user):
    if current_user["role"] != "building_manager":
        raise HTTPException(
            status_code=403,
            detail="Only building managers can use this operation.",
        )

    cur.execute(
        """
        SELECT b.id
        FROM building_manager_assignments a
        JOIN buildings b ON b.id = a.building_id
        WHERE a.manager_id = %s
          AND a.assigned_from <= CURRENT_DATE
          AND a.assigned_until IS NULL
          AND b.status = 'active'
        """,
        (current_user["id"],),
    )

    assignments = cur.fetchall()

    if len(assignments) != 1:
        raise HTTPException(
            status_code=403,
            detail="No unique active building assignment found.",
        )

    building_id = str(assignments[0][0])

    if building_id != str(current_user["building_id"]):
        raise HTTPException(
            status_code=403,
            detail="Your active building assignment has changed.",
        )

    return building_id


def _validate_building(cur, building_id):
    if building_id is None:
        return

    cur.execute(
        """
        SELECT id
        FROM buildings
        WHERE id = %s AND status = 'active'
        """,
        (building_id,),
    )

    if cur.fetchone() is None:
        raise HTTPException(
            status_code=404,
            detail="Active building not found.",
        )


def _check_manager_access(cur, announcement_id, building_id):
    cur.execute(
        """
        SELECT id
        FROM announcements
        WHERE id = %s AND building_id = %s
        """,
        (announcement_id, building_id),
    )

    if cur.fetchone() is None:
        raise HTTPException(
            status_code=404,
            detail="Announcement not found.",
        )


def create_announcement(request, current_user):
    role = current_user["role"]

    if role not in ("admin", "building_manager"):
        raise HTTPException(
            status_code=403,
            detail="Residents cannot create announcements.",
        )

    with get_connection() as conn:
        with conn.cursor() as cur:

            if role == "building_manager":
                building_id = _get_manager_building(cur, current_user)

                if request.building_id is not None:
                    if str(request.building_id) != building_id:
                        raise HTTPException(
                            status_code=403,
                            detail="You can only create announcements for your assigned building.",
                        )

                # Managers can never create global announcements.
                target_building_id = building_id

            else:
                target_building_id = request.building_id

            _validate_building(cur, target_building_id)

            if request.expires_at is not None:
                now = datetime.now(timezone.utc)

                if request.expires_at <= now:
                    raise HTTPException(
                        status_code=400,
                        detail="Expiration time must be in the future.",
                    )

            cur.execute(
                """
                INSERT INTO announcements (
                    building_id,
                    created_by,
                    title,
                    description,
                    category,
                    status,
                    published_at,
                    expires_at
                )
                VALUES (
                    %s, %s, %s, %s, %s, %s,
                    CASE
                        WHEN %s = 'published'
                        THEN CURRENT_TIMESTAMP
                        ELSE NULL
                    END,
                    %s
                )
                RETURNING id
                """,
                (
                    target_building_id,
                    current_user["id"],
                    request.title,
                    request.description,
                    request.category,
                    request.status,
                    request.status,
                    request.expires_at,
                ),
            )

            announcement_id = cur.fetchone()[0]

            _write_audit_log(
                cur,
                current_user["id"],
                "announcement.created",
                announcement_id,
                {"status": request.status},
            )

            cur.execute(
                SELECT_ANNOUNCEMENT
                + " WHERE a.id = %s",
                (announcement_id,),
            )

            result = cur.fetchone()

    return _format_announcement(result)


def list_announcements(current_user):
    role = current_user["role"]

    with get_connection() as conn:
        with conn.cursor() as cur:

            if role == "admin":
                cur.execute(
                    SELECT_ANNOUNCEMENT
                    + " ORDER BY a.created_at DESC"
                )

            elif role == "building_manager":
                building_id = _get_manager_building(cur, current_user)

                cur.execute(
                    SELECT_ANNOUNCEMENT
                    + """
                    WHERE a.building_id = %s
                    ORDER BY a.created_at DESC
                    """,
                    (building_id,),
                )

            elif role == "resident":
                cur.execute(
                    SELECT_ANNOUNCEMENT
                    + """
                    WHERE a.status = 'published'
                      AND a.published_at <= CURRENT_TIMESTAMP
                      AND (
                          a.expires_at IS NULL
                          OR a.expires_at > CURRENT_TIMESTAMP
                      )
                      AND (
                          a.building_id IS NULL
                          OR a.building_id = %s
                      )
                    ORDER BY a.published_at DESC
                    """,
                    (current_user["building_id"],),
                )

            else:
                raise HTTPException(
                    status_code=403,
                    detail="You do not have permission to view announcements.",
                )

            rows = cur.fetchall()

    return [_format_announcement(row) for row in rows]


def get_announcement(announcement_id: UUID, current_user):
    role = current_user["role"]

    with get_connection() as conn:
        with conn.cursor() as cur:

            if role == "admin":
                cur.execute(
                    SELECT_ANNOUNCEMENT + " WHERE a.id = %s",
                    (announcement_id,),
                )

            elif role == "building_manager":
                building_id = _get_manager_building(cur, current_user)

                cur.execute(
                    SELECT_ANNOUNCEMENT
                    + " WHERE a.id = %s AND a.building_id = %s",
                    (announcement_id, building_id),
                )

            elif role == "resident":
                cur.execute(
                    SELECT_ANNOUNCEMENT
                    + """
                    WHERE a.id = %s
                      AND a.status = 'published'
                      AND a.published_at <= CURRENT_TIMESTAMP
                      AND (
                          a.expires_at IS NULL
                          OR a.expires_at > CURRENT_TIMESTAMP
                      )
                      AND (
                          a.building_id IS NULL
                          OR a.building_id = %s
                      )
                    """,
                    (announcement_id, current_user["building_id"]),
                )

            else:
                raise HTTPException(status_code=403, detail="Access denied.")

            result = cur.fetchone()

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Announcement not found.",
        )

    return _format_announcement(result)


def update_announcement(announcement_id, request, current_user):
    role = current_user["role"]

    if role not in ("admin", "building_manager"):
        raise HTTPException(
            status_code=403,
            detail="Residents cannot update announcements.",
        )

    update_data = request.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="No update fields provided.",
        )

    allowed_fields = {
        "title",
        "description",
        "category",
        "status",
        "expires_at",
    }

    if not set(update_data).issubset(allowed_fields):
        raise HTTPException(status_code=400, detail="Invalid update fields.")

    with get_connection() as conn:
        with conn.cursor() as cur:

            if role == "building_manager":
                building_id = _get_manager_building(cur, current_user)
                _check_manager_access(cur, announcement_id, building_id)

            cur.execute(
                SELECT_ANNOUNCEMENT + " WHERE a.id = %s",
                (announcement_id,),
            )
            existing = cur.fetchone()

            if existing is None:
                raise HTTPException(
                    status_code=404,
                    detail="Announcement not found.",
                )

            if "expires_at" in update_data:
                expires_at = update_data["expires_at"]

                if expires_at is not None:
                    now = datetime.now(timezone.utc)

                    if expires_at <= now:
                        raise HTTPException(
                            status_code=400,
                            detail="Expiration time must be in the future.",
                        )

            assignments = []
            values = []

            for field, value in update_data.items():
                assignments.append(f"{field} = %s")
                values.append(value)

            if update_data.get("status") == "published":
                assignments.append(
                    "published_at = COALESCE(published_at, CURRENT_TIMESTAMP)"
                )

            elif update_data.get("status") == "draft":
                assignments.append("published_at = NULL")

            values.append(announcement_id)

            cur.execute(
                f"""
                UPDATE announcements
                SET {", ".join(assignments)}
                WHERE id = %s
                RETURNING id
                """,
                values,
            )

            updated_id = cur.fetchone()

            if updated_id is None:
                raise HTTPException(
                    status_code=404,
                    detail="Announcement not found.",
                )

            _write_audit_log(
                cur,
                current_user["id"],
                "announcement.updated",
                announcement_id,
                {"updated_fields": list(update_data.keys())},
            )

            cur.execute(
                SELECT_ANNOUNCEMENT + " WHERE a.id = %s",
                (announcement_id,),
            )
            result = cur.fetchone()

    return _format_announcement(result)


def archive_announcement(announcement_id, current_user):
    role = current_user["role"]

    if role not in ("admin", "building_manager"):
        raise HTTPException(
            status_code=403,
            detail="Residents cannot archive announcements.",
        )

    with get_connection() as conn:
        with conn.cursor() as cur:

            if role == "building_manager":
                building_id = _get_manager_building(cur, current_user)
                _check_manager_access(cur, announcement_id, building_id)

            cur.execute(
                """
                UPDATE announcements
                SET status = 'archived'
                WHERE id = %s
                RETURNING id
                """,
                (announcement_id,),
            )

            result = cur.fetchone()

            if result is None:
                raise HTTPException(
                    status_code=404,
                    detail="Announcement not found.",
                )

            _write_audit_log(
                cur,
                current_user["id"],
                "announcement.archived",
                announcement_id,
            )

    return {
        "message": "Announcement archived successfully.",
        "id": result[0],
    }
