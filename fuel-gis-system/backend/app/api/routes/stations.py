from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.schemas.station import StationListItemOut, StationFullOut
from app.schemas.fuel import FuelTypeOut
from app.services.station_service import StationService

router = APIRouter(prefix="/api/stations", tags=["stations"])


@router.get("", response_model=list[StationListItemOut])
def list_stations(
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    service = StationService(db)
    return service.list_stations(search=search)


@router.get("/my", response_model=list[StationListItemOut])
def my_stations(
    search: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = StationService(db)
    return service.list_my_stations(current_user=current_user, search=search)


@router.get("/fuel-types", response_model=list[FuelTypeOut])
def list_fuel_types(db: Session = Depends(get_db)):
    service = StationService(db)
    return service.list_fuel_types()


# ПУБЛИЧНАЯ карточка станции для карты
@router.get("/{station_id}/public", response_model=StationFullOut)
def get_station_public(
    station_id: int,
    db: Session = Depends(get_db),
):
    service = StationService(db)
    return service.get_station_public(station_id=station_id)


@router.get("/{station_id}", response_model=StationFullOut)
def get_station(
    station_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = StationService(db)
    return service.get_station_full(station_id=station_id, current_user=current_user)