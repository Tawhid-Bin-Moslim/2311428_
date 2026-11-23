
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class PromoteResidentRequest(BaseModel):
    building_id: UUID


class DemoteManagerRequest(BaseModel):
    flat_id: UUID
    occupancy_type: Literal["owner", "tenant"]


class UserManagementResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    role: Literal["admin", "building_manager", "resident"]
    login_id: str | None = None
    message: str


class ManagedUserResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    role: Literal["admin", "building_manager", "resident"]
    login_id: str | None = None
    is_active: bool
