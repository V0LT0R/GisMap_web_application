from typing import Any, Dict, List
import httpx
from fastapi import HTTPException
from app.core.config import settings


class DgisService:
    def __init__(self) -> None:
        self.base_url = settings.DGIS_BASE_URL.rstrip("/")
        self.api_key = settings.DGIS_API_KEY

    async def fetch_fuel_stations_astana(self) -> Dict[str, Any]:
        if not self.api_key:
            raise HTTPException(status_code=500, detail="DGIS_API_KEY is not configured")

        url = f"{self.base_url}/items"
        params = {
            "key": self.api_key,
            "q": "АЗС Астана",
            "type": "branch",
            "point": "71.4304,51.1282",
            "radius": 30000,
            "location": "71.4304,51.1282",
            "sort": "distance",
            "page": 1,
            "page_size": 10,
            "fields": "items.point,items.address,items.full_address_name,items.schedule,items.rubrics,items.org,items.brand,items.description",
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            print("2GIS STATUS:", response.status_code)
            print("2GIS TEXT:", response.text[:1500])
            response.raise_for_status()
            payload = response.json()

        items = payload.get("result", {}).get("items", [])
        features: List[Dict[str, Any]] = []

        for item in items:
            point = item.get("point") or {}
            lon = point.get("lon")
            lat = point.get("lat")

            if lon is None or lat is None:
                continue

            address_obj = item.get("address") or {}
            schedule = item.get("schedule") or {}
            brand_obj = item.get("brand") or {}
            org_obj = item.get("org") or {}
            rubrics = item.get("rubrics") or []
            description = item.get("description") or ""

            fuel_types = []
            desc_lower = description.lower()

            if "аи-92" in desc_lower or "аи 92" in desc_lower or "aи-92" in desc_lower:
                fuel_types.append("АИ-92")
            if "аи-95" in desc_lower or "аи 95" in desc_lower or "aи-95" in desc_lower:
                fuel_types.append("АИ-95")
            if "аи-98" in desc_lower or "аи 98" in desc_lower or "aи-98" in desc_lower:
                fuel_types.append("АИ-98")
            if "дизель" in desc_lower:
                fuel_types.append("ДТ")
            if "газ" in desc_lower or "lpg" in desc_lower:
                fuel_types.append("Газ")

            features.append(
                {
                    "type": "Feature",
                    "id": item.get("id"),
                    "geometry": {
                        "type": "Point",
                        "coordinates": [lon, lat],
                    },
                    "properties": {
                        "id": item.get("id"),
                        "name": item.get("name"),
                        "full_name": item.get("full_name"),
                        "address_name": address_obj.get("name"),
                        "full_address_name": item.get("full_address_name"),
                        "brand": brand_obj.get("name"),
                        "org_name": org_obj.get("name"),
                        "schedule_text": schedule.get("text"),
                        "rubrics": [r.get("name") for r in rubrics if r.get("name")],
                        "description": description,
                        "fuel_types": fuel_types,
                    },
                }
            )

        return {
            "type": "FeatureCollection",
            "features": features,
        }