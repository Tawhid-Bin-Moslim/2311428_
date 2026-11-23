
from fastapi import APIRouter, Depends

from schemas.maintenance import (
    MaintenanceRequestCreate,
    MaintenanceRequestUpdate,
)
from services.maintenance import (
    create_maintenance_request,
    get_maintenance_request,
    list_maintenance_requests,
    update_maintenance_request,
    delete_maintenance_request,
)
from dependencies import get_current_user


router = APIRouter(
    prefix="/api/maintenance-requests",
    tags=["Maintenance Requests"],
)


@router.post("", status_code=201)
def create_request(
    request: MaintenanceRequestCreate,
    current_user: dict = Depends(get_current_user),
):
    return create_maintenance_request(request, current_user)


@router.get("/{request_id}")
def get_request(
    request_id: int,
    current_user: dict = Depends(get_current_user),
):
    return get_maintenance_request(request_id, current_user)


@router.get("")
def list_requests(
    current_user: dict = Depends(get_current_user),
):
    return list_maintenance_requests(current_user)


@router.put("/{request_id}")
def update_request(
    request_id: int,
    request: MaintenanceRequestUpdate,
    current_user: dict = Depends(get_current_user),
):
    return update_maintenance_request(request_id, request, current_user)


@router.delete("/{request_id}")
def delete_request(
    request_id: int,
    current_user: dict = Depends(get_current_user),
):
    return delete_maintenance_request(request_id, current_user)
