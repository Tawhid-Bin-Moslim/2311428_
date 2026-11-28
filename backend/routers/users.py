from uuid import UUID

from fastapi import APIRouter, Depends

from dependencies import require_role, require_super_admin
from schemas.users import (
    CreateAdminRequest,
    ChangeUserRoleRequest,
    PromoteResidentRequest,
    DemoteManagerRequest,
    UserManagementResponse,
    ManagedUserResponse,
)
from services.users import list_users
from services.role_management import change_user_role, create_admin_account


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
    "",
    response_model=UserManagementResponse,
)
def create_admin_user(
    request: CreateAdminRequest,
    current_user: dict = Depends(require_super_admin()),
):
    return create_admin_account(request, current_user)

@router.patch(
    "/{user_id}/role",
    response_model=UserManagementResponse,
)
def update_user_role(
    user_id: UUID,
    request: ChangeUserRoleRequest,
    current_user: dict = Depends(require_role("admin")),
):
    return change_user_role(user_id, request, current_user)


@router.post(
    "/{user_id}/promote",
    response_model=UserManagementResponse,
)
def promote_user(
    user_id: UUID,
    request: PromoteResidentRequest,
    current_user: dict = Depends(require_role("admin")),
):
    role_request = ChangeUserRoleRequest(
        role="building_manager",
        building_id=request.building_id,
    )
    return change_user_role(user_id, role_request, current_user)


@router.post(
    "/{user_id}/demote",
    response_model=UserManagementResponse,
)
def demote_user(
    user_id: UUID,
    request: DemoteManagerRequest,
    current_user: dict = Depends(require_role("admin")),
):
    role_request = ChangeUserRoleRequest(
        role="resident",
        flat_id=request.flat_id,
        occupancy_type=request.occupancy_type,
    )
    return change_user_role(user_id, role_request, current_user)
