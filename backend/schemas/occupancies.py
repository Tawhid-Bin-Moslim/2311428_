
from datetime import date
from uuid import UUID
from typing import Literal

from pydantic import BaseModel, Field


class OccupancyCreate(BaseModel):
    resident_id: UUID
    flat_id: UUID
    occupancy_type: Literal["owner", "tenant"]
    move_in_date: date = Field(default_factory=date.today)


class OccupancyUpdate(BaseModel):
    occupancy_type: Literal["owner", "tenant"]


class OccupancyResponse(BaseModel):
    id: str
    resident_id: str
    resident_name: str
    resident_email: str
    flat_id: str
    flat_number: str
    floor_number: int
    building_id: str
    building_name: str
    occupancy_type: str
    move_in_date: date
    move_out_date: date | None
