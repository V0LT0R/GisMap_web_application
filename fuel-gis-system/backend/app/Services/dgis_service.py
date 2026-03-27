from typing import Any
import requests

from app.core.config import settings


class DgisService:
    def __init__(self):
        self.api_key = settings.DGIS_API_KEY
        self.base_url = settings.DGIS_BASE_URL.rstrip("/")

    def search_gas_stations(
        self,
        lat: float,
        lon: float,
        radius: int = 8000,
        page: int = 1,
        page_size: int = 10,
    ) -> dict[str, Any]:
        url = f"{self.base_url}/items"

        params = {
            "q": "АЗС",
            "point": f"{lon},{lat}",
            "radius": radius,
            "page": page,
            "page_size": 10,
            "fields": "items.point,items.rubrics,items.schedule,items.description",
            "key": self.api_key,
        }

        response = requests.get(url, params=params, timeout=30)

        print("\n=== 2GIS REQUEST DEBUG ===")
        print("URL:", response.url)
        print("STATUS:", response.status_code)
        print("TEXT:", response.text[:1200])
        print("=== END DEBUG ===\n")

        response.raise_for_status()
        return response.json()