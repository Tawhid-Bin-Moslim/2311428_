
from fastapi import APIRouter

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

router = APIRouter(
    prefix="/api/maintenance-requests",
    tags=["Maintenance Requests"],
)


@router.post("", status_code=201)
def create_request(request: MaintenanceRequestCreate):
    return create_maintenance_request(request)


@router.get("/{request_id}")
def get_request(request_id: int):
    return get_maintenance_request(request_id)


@router.get("")
def list_requests():
    return list_maintenance_requests()


@router.put("/{request_id}")
def update_request(
    request_id: int,
    request: MaintenanceRequestUpdate,
):
    return update_maintenance_request(request_id, request)


@router.delete("/{request_id}")
def delete_request(request_id: int):
    return delete_maintenance_request(request_id)
