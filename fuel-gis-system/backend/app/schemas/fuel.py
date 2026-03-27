from pydantic import BaseModel, Field


class FuelTypeOut(BaseModel):
    id: int
    code: str
    name: str
    sort_order: int

    model_config = {"from_attributes": True}


class StationFuelItemUpdate(BaseModel):
    fuel_type_id: int
    is_available: bool = False
    price: float | None = Field(default=None, ge=0)


class StationFuelOut(BaseModel):
    fuel_type_id: int
    code: str
    name: str
    is_available: bool
    price: float | None

    model_config = {"from_attributes": True}