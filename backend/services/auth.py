
from fastapi import HTTPException

from database import get_connection
from security import verify_password, create_access_token


def _normalize_role(role: str) -> str:
    """Convert the login form's role into the database role."""
    normalized = role.strip().lower().replace(" ", "_")

    allowed_roles = {
        "admin",
        "building_manager",
        "resident",
    }

    if normalized not in allowed_roles:
        raise HTTPException(
            status_code=400,
            detail="Invalid role selected.",
        )

    return normalized


def authenticate_user(request):
    """
    Authenticate Admin, Building Manager, or Resident.

    Admin and Building Manager:
        Login ID + email + password

    Resident:
        Flat number + email + password
        Requires an active occupancy.
    """

    role = _normalize_role(request.role)
    email = str(request.email).strip().lower()
    login_id = request.user_id.strip()

    with get_connection() as conn:
        with conn.cursor() as cur:

            # ADMIN / BUILDING MANAGER LOGIN
            if role in ("admin", "building_manager"):

                cur.execute(
                    """
                    SELECT
                        id,
                        login_id,
                        full_name,
                        email,
                        password_hash,
                        role,
                        is_active
                    FROM users
                    WHERE login_id = %s
                      AND LOWER(email) = %s
                      AND role = %s
                    """,
                    (login_id, email, role),
                )

                user = cur.fetchone()

                if user is None or not user[6]:
                    raise HTTPException(
                        status_code=401,
                        detail="Invalid login credentials.",
                    )

                if not verify_password(request.password, user[4]):
                    raise HTTPException(
                        status_code=401,
                        detail="Invalid login credentials.",
                    )

                user_uuid = str(user[0])
                authenticated_user_id = user[1]
                full_name = user[2]
                building_id = None

                # A manager must have exactly one active
                # building assignment to access the system.
                if role == "building_manager":

                    cur.execute(
                        """
                        SELECT building_id
                        FROM building_manager_assignments
                        WHERE manager_id = %s
                          AND assigned_from <= CURRENT_DATE
                          AND assigned_until IS NULL
                        """,
                        (user[0],),
                    )

                    assignments = cur.fetchall()

                    if len(assignments) == 0:
                        raise HTTPException(
                            status_code=403,
                            detail=(
                                "Your account has no active "
                                "building assignment."
                            ),
                        )

                    if len(assignments) > 1:
                        raise HTTPException(
                            status_code=409,
                            detail=(
                                "Multiple active building assignments "
                                "were found. Please contact the Admin."
                            ),
                        )

                    building_id = str(assignments[0][0])

            # RESIDENT LOGIN
            else:

                cur.execute(
                    """
                    SELECT
                        u.id,
                        f.flat_number,
                        u.full_name,
                        u.email,
                        u.password_hash,
                        u.is_active,
                        f.building_id
                    FROM users u
                    JOIN occupancies o
                        ON o.resident_id = u.id
                    JOIN flats f
                        ON f.id = o.flat_id
                    WHERE f.flat_number = %s
                      AND LOWER(u.email) = %s
                      AND u.role = 'resident'
                      AND u.is_active = TRUE
                      AND o.move_out_date IS NULL
                      AND o.move_in_date <= CURRENT_DATE
                    """,
                    (login_id, email),
                )

                residents = cur.fetchall()

                if len(residents) == 0:
                    raise HTTPException(
                        status_code=401,
                        detail="Invalid login credentials.",
                    )

                if len(residents) > 1:
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            "Multiple active occupancy records were "
                            "found. Please contact the Building Manager."
                        ),
                    )

                user = residents[0]

                if not verify_password(request.password, user[4]):
                    raise HTTPException(
                        status_code=401,
                        detail="Invalid login credentials.",
                    )

                user_uuid = str(user[0])
                authenticated_user_id = user[1]
                full_name = user[2]
                building_id = str(user[6])

    # CREATE JWT ACCESS TOKEN

    token_data = {
        "sub": user_uuid,
        "role": role,
        "user_id": authenticated_user_id,
    }

    if building_id is not None:
        token_data["building_id"] = building_id

    access_token = create_access_token(token_data)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": role,
        "user_id": authenticated_user_id,
        "full_name": full_name,
    }