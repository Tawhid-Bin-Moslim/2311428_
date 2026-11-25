from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator, field_validator


AnnouncementCategory = Literal[
    "general",
    "maintenance",
    "billing",
    "security",
]

AnnouncementStatus = Literal["draft", "published"]


def validate_timezone(value: datetime | None) -> datetime | None:
    if value is not None and (
        value.tzinfo is None or value.utcoffset() is None
    ):
        raise ValueError(
            "Expiration datetime must include a timezone."
        )

    return value


class AnnouncementCreate(BaseModel):
    building_id: UUID | None = None
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=5)
    category: AnnouncementCategory = "general"
    status: AnnouncementStatus = "draft"
    expires_at: datetime | None = None

    @field_validator("expires_at")
    @classmethod
    def check_expires_at_timezone(cls, value):
        return validate_timezone(value)


class AnnouncementUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = Field(default=None, min_length=5)
    category: AnnouncementCategory | None = None
    status: AnnouncementStatus | None = None
    expires_at: datetime | None = None

    @field_validator("expires_at")
    @classmethod
    def check_expires_at_timezone(cls, value):
        return validate_timezone(value)

    @model_validator(mode="after")
    def validate_update(self):
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided.")

        for field in ("title", "description", "category", "status"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null.")

        return self


class AnnouncementResponse(BaseModel):
    id: UUID
    building_id: UUID | None
    created_by: UUID
    created_by_name: str
    title: str
    description: str
    category: AnnouncementCategory
    status: Literal["draft", "published", "archived"]
    published_at: datetime | None
    expires_at: datetime | None
    created_at: datetime