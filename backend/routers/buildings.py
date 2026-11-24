
from uuid import UUID

from fastapi import APIRouter, Depends

from dependencies import get_current_user, require_role
from schemas.buildings import (
    BuildingCreate,
    BuildingUpdate,
    BuildingResponse,
)
from services.buildings import (
    list_buildings,
    get_building,
    create_building,
    update_building,
)


router = APIRouter(
    prefix="/api/buildings",
    tags=["Building Management"],
)


@router.get("", response_model=list[BuildingResponse])
def get_buildings(
    current_user: dict = Depends(get_current_user),
):
    return list_buildings(current_user)


@router.get("/{building_id}", response_model=BuildingResponse)
def get_building_details(
    building_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    return get_building(building_id, current_user)


@router.post("", response_model=BuildingResponse, status_code=201)
def create_new_building(
    request: BuildingCreate,
    current_user: dict = Depends(require_role("admin")),
):
    return create_building(request, current_user)


@router.put("/{building_id}", response_model=BuildingResponse)
def edit_building(
    building_id: UUID,
    request: BuildingUpdate,
    current_user: dict = Depends(require_role("admin")),
):
    return update_building(building_id, request, current_user)
