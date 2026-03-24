from fastapi import APIRouter, HTTPException
from app.services.dgis_service import DgisService
from app.core.config import settings

router = APIRouter(prefix="/api/stations", tags=["stations"])


@router.get("/2gis")
async def get_2gis_stations():
    try:
        print("DGIS_API_KEY loaded:", bool(settings.DGIS_API_KEY))
        service = DgisService()
        return await service.fetch_fuel_stations_astana()
    except Exception as e:
        print("ERROR IN /api/stations/2gis:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))