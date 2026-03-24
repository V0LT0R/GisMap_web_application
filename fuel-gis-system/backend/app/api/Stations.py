from fastapi import APIRouter, HTTPException
from app.Services.dgis_service import DgisService
from app.core.config import settings

router = APIRouter(prefix="/api/stations", tags=["stations"])


@router.get("/2gis")
async def get_2gis_stations():
    try:
        print("DGIS_API_KEY loaded:", bool(settings.DGIS_API_KEY))
        print("DGIS_BASE_URL:", settings.DGIS_BASE_URL)

        service = DgisService()
        result = await service.fetch_fuel_stations_astana()
        return result
    except Exception as e:
        print("ERROR IN /api/stations/2gis:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))