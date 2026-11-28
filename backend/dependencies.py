
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from database import get_connection
from security import decode_access_token


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_access_token(credentials.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    token_role = payload.get("role")

    if not user_id or not token_role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    full_name,
                    role,
                    is_active,
                    is_super_admin
                FROM users
                WHERE id = %s
                """,
                (user_id,),
            )
            user = cur.fetchone()

            if user is None or not user[3]:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User account is inactive or does not exist.",
                )

            if user[2] != token_role:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token.",
                )

            is_super_admin = bool(user[4])

            if is_super_admin and user[2] != "admin":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid account privilege configuration.",
                )

            building_id = None
            flat_id = None

            if user[2] == "building_manager":
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

                if len(assignments) != 1:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="No unique active building assignment found.",
                    )

                building_id = str(assignments[0][0])

            elif user[2] == "resident":
                cur.execute(
                    """
                    SELECT f.id, f.building_id
                    FROM occupancies o
                    JOIN flats f ON f.id = o.flat_id
                    WHERE o.resident_id = %s
                      AND o.move_out_date IS NULL
                      AND o.move_in_date <= CURRENT_DATE
                    """,
                    (user[0],),
                )

                occupancies = cur.fetchall()

                if len(occupancies) != 1:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="No unique active flat occupancy found.",
                    )

                flat_id = str(occupancies[0][0])
                building_id = str(occupancies[0][1])

    return {
        "id": str(user[0]),
        "full_name": user[1],
        "role": user[2],
        "is_super_admin": is_super_admin,
        "building_id": building_id,
        "flat_id": flat_id,
    }


def require_role(*allowed_roles: str):
    def role_checker(current_user=Depends(get_current_user)):
        if current_user["role"] not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )

        return current_user

    return role_checker


def require_super_admin():
    def super_admin_checker(current_user=Depends(get_current_user)):
        if (
            current_user["role"] != "admin"
            or not current_user["is_super_admin"]
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super Admin privileges are required.",
            )

        return current_user

    return super_admin_checker
