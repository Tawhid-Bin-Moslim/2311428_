
from uuid import UUID

from fastapi import APIRouter, Depends

from dependencies import require_role
from schemas.users import (
    PromoteResidentRequest,
    DemoteManagerRequest,
    UserManagementResponse,
    ManagedUserResponse,
)
from services.users import (
    list_users,
    promote_resident,
    demote_manager,
)


router = APIRouter(
    prefix="/api/admin/users",
    tags=["Admin - User Management"],
)


@router.get(
    "",
    response_model=list[ManagedUserResponse],
)
def get_users(
    current_user: dict = Depends(require_role("admin")),
):
    return list_users()


@router.post(
    "/{user_id}/promote",
    response_model=UserManagementResponse,
)
def promote_user(
    user_id: UUID,
    request: PromoteResidentRequest,
    current_user: dict = Depends(require_role("admin")),
):
    return promote_resident(
        user_id,
        request.building_id,
        current_user,
    )


@router.post(
    "/{user_id}/demote",
    response_model=UserManagementResponse,
)
def demote_user(
    user_id: UUID,
    request: DemoteManagerRequest,
    current_user: dict = Depends(require_role("admin")),
):
    return demote_manager(
        user_id,
        request.flat_id,
        request.occupancy_type,
        current_user,
    )
