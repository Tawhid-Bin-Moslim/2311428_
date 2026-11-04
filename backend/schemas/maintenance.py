
from pydantic import BaseModel, Field
from typing import Literal


class MaintenanceRequestCreate(BaseModel):
    title: str = Field(min_length=3, max_length=150)
    description: str = Field(min_length=5)
    location: str = Field(min_length=2, max_length=150)
    priority: Literal["low", "medium", "high"] = "medium"


class MaintenanceRequestUpdate(BaseModel):
    status: Literal["pending", "in_progress", "completed"]
