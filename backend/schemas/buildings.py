
from typing import Literal


from pydantic import BaseModel, Field, field_validator

class BuildingCreate(BaseModel):
    building_code: str = Field(min_length=2, max_length=30)
    name: str = Field(min_length=2, max_length=150)
    address: str = Field(min_length=5)
    total_floors: int = Field(gt=0)
    total_flats: int = Field(gt=0)
    contact_phone: str | None = Field(default=None, max_length=30)


# class BuildingUpdate(BaseModel):
#     name: str | None = Field(default=None, min_length=2, max_length=150)
#     address: str | None = Field(default=None, min_length=5)
#     total_floors: int | None = Field(default=None, gt=0)
#     total_flats: int | None = Field(default=None, gt=0)
#     contact_phone: str | None = Field(default=None, max_length=30)
#     status: Literal["active", "inactive"] | None = None
class BuildingUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    address: str | None = Field(default=None, min_length=5)
    total_floors: int | None = Field(default=None, gt=0)
    total_flats: int | None = Field(default=None, gt=0)
    contact_phone: str | None = Field(default=None, max_length=30)
    status: Literal["active", "inactive"] | None = None

    @field_validator(
        "name",
        "address",
        "total_floors",
        "total_flats",
        "status",
        mode="before",
    )
    @classmethod
    def reject_null_required_fields(cls, value):
        if value is None:
            raise ValueError("This field cannot be null.")
        return value

class BuildingResponse(BaseModel):
    id: str
    building_code: str
    name: str
    address: str
    total_floors: int
    total_flats: int
    contact_phone: str | None = None
    status: Literal["active", "inactive"]
