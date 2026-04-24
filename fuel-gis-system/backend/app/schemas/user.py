from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserOut(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    is_email_verified: bool
    created_at: datetime

    model_config = {
        "from_attributes": True
    }


class AdminUserCreateRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    is_active: bool = True
    is_email_verified: bool = True


class AdminUserStationOut(BaseModel):
    id: int
    name: str | None = None
    address_name: str | None = None
    full_address_name: str | None = None


class AdminUserOut(UserOut):
    assigned_station_ids: list[int] = []
    assigned_stations: list[AdminUserStationOut] = []


class ReplaceAdminStationsRequest(BaseModel):
    station_ids: list[int] = []
