from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class FlatCreate(BaseModel):
    building_id: UUID
    flat_number: str = Field(min_length=1, max_length=20)
    floor_number: int = Field(ge=0)

    @field_validator("flat_number")
    @classmethod
    def validate_flat_number(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Flat number cannot be empty.")
        return value


class FlatUpdate(BaseModel):
    flat_number: str | None = Field(default=None, min_length=1, max_length=20)
    floor_number: int | None = Field(default=None, ge=0)

    @field_validator("flat_number", "floor_number", mode="before")
    @classmethod
    def reject_null(cls, value):
        if value is None:
            raise ValueError("This field cannot be null.")
        return value

    @field_validator("flat_number")
    @classmethod
    def validate_flat_number(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Flat number cannot be empty.")
        return value


class FlatResponse(BaseModel):
    id: str
    building_id: str
    flat_number: str
    floor_number: int