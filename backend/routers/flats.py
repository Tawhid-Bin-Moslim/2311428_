from uuid import UUID

from fastapi import APIRouter, Depends

from dependencies import get_current_user
from schemas.flats import FlatCreate, FlatUpdate, FlatResponse
from services.flats import (
    list_flats,
    get_flat,
    create_flat,
    update_flat,
)


router = APIRouter(
    prefix="/api/flats",
    tags=["Flat Management"],
)


@router.get("", response_model=list[FlatResponse])
def get_flats(
    building_id: UUID | None = None,
    current_user: dict = Depends(get_current_user),
):
    return list_flats(current_user, building_id)


@router.get("/{flat_id}", response_model=FlatResponse)
def get_flat_details(
    flat_id: UUID,
    current_user: dict = Depends(get_current_user),
):
    return get_flat(flat_id, current_user)


@router.post("", response_model=FlatResponse, status_code=201)
def create_new_flat(
    request: FlatCreate,
    current_user: dict = Depends(get_current_user),
):
    return create_flat(request, current_user)


@router.put("/{flat_id}", response_model=FlatResponse)
def edit_flat(
    flat_id: UUID,
    request: FlatUpdate,
    current_user: dict = Depends(get_current_user),
):
    return update_flat(flat_id, request, current_user)