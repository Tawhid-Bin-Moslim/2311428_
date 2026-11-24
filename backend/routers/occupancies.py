
from uuid import UUID

from fastapi import APIRouter, Depends

from dependencies import get_current_user
from schemas.occupancies import (
    OccupancyCreate,
    OccupancyUpdate,
    OccupancyResponse,
)
from services.occupancies import (
    list_occupancies,
    get_occupancy,
    get_my_occupancies,
    create_occupancy,
    update_occupancy,
    end_occupancy,
)


router = APIRouter(
    prefix="/api/occupancies",
    tags=["Occupancy Management"],
)


@router.get("/me", response_model=list[OccupancyResponse])
def get_my_occupancy_records(
    current_user: dict = Depends(get_current_user),
):
    return get_my_occupancies(current_user)


@router.get("", response_model=list[OccupancyResponse])
def get_all_occupancies(
    current_user: dict = Depends(get_current_user),
):
    return list_occupancies(current_user)


@router.get("/{occupancy_id}", response_model=OccupancyResponse)
def get_occupancy_details(
    occupancy_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    return get_occupancy(occupancy_id, current_user)


@router.post(
    "",
    response_model=OccupancyResponse,
    status_code=201,
)
def create_new_occupancy(
    request: OccupancyCreate,
    current_user: dict = Depends(get_current_user),
):
    return create_occupancy(request, current_user)


@router.put(
    "/{occupancy_id}",
    response_model=OccupancyResponse,
)
def edit_occupancy(
    occupancy_id: UUID,
    request: OccupancyUpdate,
    current_user: dict = Depends(get_current_user),
):
    return update_occupancy(occupancy_id, request, current_user)


@router.patch(
    "/{occupancy_id}/end",
    response_model=OccupancyResponse,
)
def end_occupancy_record(
    occupancy_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    return end_occupancy(occupancy_id, current_user)
