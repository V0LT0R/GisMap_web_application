from datetime import datetime
from pydantic import BaseModel, Field


class StationBaseOut(BaseModel):
    id: int
    external_id: str
    source: str
    name: str | None = None
    full_name: str | None = None
    address_name: str | None = None
    full_address_name: str | None = None
    brand: str | None = None
    org_name: str | None = None
    description: str | None = None
    schedule_text_api: str | None = None
    rubrics_json: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class StationDetailsOut(BaseModel):
    is_operational: bool = True
    working_hours: str | None = None
    columns_count: int | None = None
    main_photo_url: str | None = None

    model_config = {"from_attributes": True}


class StationDetailsUpdate(BaseModel):
    is_operational: bool = True
    working_hours: str | None = Field(default=None, max_length=255)
    columns_count: int | None = Field(default=None, ge=0)
    main_photo_url: str | None = Field(default=None, max_length=1000)


class StationListItemOut(BaseModel):
    id: int
    name: str | None = None
    full_name: str | None = None
    address_name: str | None = None
    full_address_name: str | None = None
    brand: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    is_operational: bool = True
    working_hours: str | None = None
    columns_count: int | None = None
    main_photo_url: str | None = None
    fuel_codes: list[str] = []

    model_config = {"from_attributes": True}


class StationFullOut(BaseModel):
    station: StationBaseOut
    details: StationDetailsOut
    fuels: list[dict]


class AssignStationsRequest(BaseModel):
    admin_user_id: int
    station_ids: list[int]


class MessageResponse(BaseModel):
    message: str