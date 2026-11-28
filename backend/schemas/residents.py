from datetime import date
import re
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class CreateResidentRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    email: str = Field(..., min_length=5, max_length=255)
    flat_id: UUID
    password: str = Field(..., min_length=4, max_length=128)
    occupancy_type: Literal["owner", "tenant"] = "tenant"

    @model_validator(mode="after")
    def validate_fields(self):
        self.full_name = self.full_name.strip()
        self.email = self.email.strip().lower()

        if len(self.full_name) < 2:
            raise ValueError("Full name must contain at least 2 characters.")

        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", self.email):
            raise ValueError("A valid email address is required.")

        return self


class ResetPasswordRequest(BaseModel):
    password: str = Field(..., min_length=4, max_length=128)


class ResidentManagementResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    role: Literal["resident"]
    is_active: bool
    flat_id: UUID
    flat_number: str
    floor_number: int
    building_id: UUID
    building_name: str
    occupancy_type: Literal["owner", "tenant"]
    move_in_date: date


class ResidentActionResponse(BaseModel):
    id: UUID
    message: str