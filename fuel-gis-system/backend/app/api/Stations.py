from fastapi import APIRouter, HTTPException, Query
from app.services.dgis_service import DgisService
from app.core.config import settings

router = APIRouter(prefix="/api/stations", tags=["stations"])


@router.get("/2gis")
async def get_2gis_stations(
    lat: float = Query(..., description="Широта пользователя"),
    lon: float = Query(..., description="Долгота пользователя"),
    radius: int = Query(30000, ge=1000, le=100000, description="Радиус поиска в метрах"),
):
    try:
        print("DGIS_API_KEY loaded:", bool(settings.DGIS_API_KEY))
        service = DgisService()
        return await service.fetch_fuel_stations_by_location(
            lat=lat,
            lon=lon,
            radius=radius,
        )
    except Exception as e:
        print("ERROR IN /api/stations/2gis:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))