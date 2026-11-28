from uuid import UUID

from fastapi import APIRouter, Depends

from dependencies import require_role
from schemas.residents import (
    CreateResidentRequest,
    ResetPasswordRequest,
    ResidentManagementResponse,
    ResidentActionResponse,
)
from services.residents import (
    list_residents,
    create_resident,
    reset_account_password,
    deactivate_resident,
)


router = APIRouter(
    prefix="/api",
    tags=["Resident Management"],
)


@router.get(
    "/residents",
    response_model=list[ResidentManagementResponse],
)
def get_residents(
    current_user: dict = Depends(
        require_role("admin", "building_manager")
    ),
):
    return list_residents(current_user)


@router.post(
    "/residents",
    response_model=ResidentManagementResponse,
    status_code=201,
)
def add_resident(
    request: CreateResidentRequest,
    current_user: dict = Depends(
        require_role("admin", "building_manager")
    ),
):
    return create_resident(request, current_user)


@router.patch(
    "/users/{user_id}/password",
    response_model=ResidentActionResponse,
)
def reset_user_password(
    user_id: UUID,
    request: ResetPasswordRequest,
    current_user: dict = Depends(
        require_role("admin", "building_manager")
    ),
):
    return reset_account_password(user_id, request, current_user)


@router.delete(
    "/residents/{user_id}",
    response_model=ResidentActionResponse,
)
def remove_resident(
    user_id: UUID,
    current_user: dict = Depends(
        require_role("building_manager")
    ),
):
    return deactivate_resident(user_id, current_user)