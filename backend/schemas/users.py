from typing import Literal
from uuid import UUID

import re
from pydantic import BaseModel, Field, model_validator


class CreateAdminRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=4, max_length=128)

    @model_validator(mode="after")
    def normalize_and_validate(self):
        self.full_name = self.full_name.strip()
        self.email = self.email.strip().lower()

        if len(self.full_name) < 2:
            raise ValueError("Full name must contain at least 2 characters.")

        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", self.email):
            raise ValueError("A valid email address is required.")

        return self

class PromoteResidentRequest(BaseModel):
    building_id: UUID


class DemoteManagerRequest(BaseModel):
    flat_id: UUID
    occupancy_type: Literal["owner", "tenant"]


class ChangeUserRoleRequest(BaseModel):
    role: Literal["admin", "building_manager", "resident"]
    building_id: UUID | None = None
    flat_id: UUID | None = None
    occupancy_type: Literal["owner", "tenant"] | None = None

    @model_validator(mode="after")
    def validate_role_details(self):
        if self.role == "building_manager":
            if self.building_id is None:
                raise ValueError(
                    "Building ID is required for a Building Manager."
                )

            if self.flat_id is not None or self.occupancy_type is not None:
                raise ValueError(
                    "Flat information is not allowed for a Building Manager."
                )

        elif self.role == "resident":
            if self.flat_id is None or self.occupancy_type is None:
                raise ValueError(
                    "Flat ID and occupancy type are required for a Resident."
                )

            if self.building_id is not None:
                raise ValueError(
                    "Building ID is determined from the selected flat."
                )

        elif self.role == "admin":
            if (
                self.building_id is not None
                or self.flat_id is not None
                or self.occupancy_type is not None
            ):
                raise ValueError(
                    "Building and flat information are not required for Admin."
                )

        return self


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
    is_super_admin: bool
    assigned_building_id: UUID | None = None
    assigned_building_name: str | None = None
