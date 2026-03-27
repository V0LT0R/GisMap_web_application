from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_admin_or_super_admin, require_super_admin
from app.core.database import get_db
from app.models.user import User
from app.schemas.station import (
    StationDetailsUpdate,
    AssignStationsRequest,
    MessageResponse,
)
from app.schemas.fuel import StationFuelItemUpdate
from app.services.station_service import StationService

router = APIRouter(prefix="/api/admin/stations", tags=["admin-stations"])


@router.put("/{station_id}/details", response_model=MessageResponse)
def update_station_details(
    station_id: int,
    payload: StationDetailsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_super_admin),
):
    service = StationService(db)
    return service.update_station_details(
        station_id=station_id,
        current_user=current_user,
        payload=payload,
    )


@router.put("/{station_id}/fuels", response_model=MessageResponse)
def update_station_fuels(
    station_id: int,
    payload: list[StationFuelItemUpdate],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_super_admin),
):
    service = StationService(db)
    return service.update_station_fuels(
        station_id=station_id,
        current_user=current_user,
        items=payload,
    )


@router.post("/assign", response_model=MessageResponse)
def assign_stations(
    payload: AssignStationsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    service = StationService(db)
    return service.assign_stations_to_admin(
        admin_user_id=payload.admin_user_id,
        station_ids=payload.station_ids,
        current_user=current_user,
    )