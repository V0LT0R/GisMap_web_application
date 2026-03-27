from typing import Any, Dict, List
import httpx
from fastapi import HTTPException
from app.core.config import settings


class DgisService:
    def __init__(self) -> None:
        self.base_url = settings.DGIS_BASE_URL.rstrip("/")
        self.api_key = settings.DGIS_API_KEY

    async def fetch_fuel_stations_by_location(
        self,
        lat: float,
        lon: float,
        radius: int = 5000,
    ) -> Dict[str, Any]:
        if not self.api_key:
            raise HTTPException(status_code=500, detail="DGIS_API_KEY is not configured")

        url = f"{self.base_url}/items"
        point = f"{lon},{lat}"

        all_items: List[dict] = []
        seen_ids: set[str] = set()

        async with httpx.AsyncClient(timeout=25.0) as client:
            for page in range(1, 4):  # меньше страниц = стабильнее
                params = {
                    "key": self.api_key,
                    "q": "АЗС",
                    "type": "branch",
                    "point": point,
                    "location": point,
                    "radius": radius,
                    "sort": "distance",
                    "page": page,
                    "page_size": 10,
                    "fields": "items.point,items.address,items.full_address_name,items.schedule,items.rubrics,items.org,items.brand,items.description",
                }

                try:
                    response = await client.get(url, params=params)
                    print(f"2GIS STATUS page {page}:", response.status_code)
                    print("2GIS TEXT:", response.text[:800])
                    response.raise_for_status()
                except httpx.HTTPStatusError as exc:
                    raise HTTPException(
                        status_code=502,
                        detail=f"2GIS API error: {exc.response.status_code}"
                    ) from exc
                except httpx.HTTPError as exc:
                    raise HTTPException(
                        status_code=502,
                        detail=f"2GIS API unavailable: {str(exc)}"
                    ) from exc

                payload = response.json()
                items = payload.get("result", {}).get("items", [])

                if not items:
                    break

                for item in items:
                    item_id = str(item.get("id"))
                    if item_id in seen_ids:
                        continue
                    seen_ids.add(item_id)
                    all_items.append(item)

                if len(items) < 10:
                    break

        features: List[Dict[str, Any]] = []

        for item in all_items:
            point_obj = item.get("point") or {}
            item_lon = point_obj.get("lon")
            item_lat = point_obj.get("lat")

            if item_lon is None or item_lat is None:
                continue

            address_obj = item.get("address") or {}
            schedule = item.get("schedule") or {}
            brand_obj = item.get("brand") or {}
            org_obj = item.get("org") or {}
            rubrics = item.get("rubrics") or []
            description = item.get("description") or ""

            fuel_types = []
            desc_lower = description.lower()

            if "аи-92" in desc_lower or "аи 92" in desc_lower:
                fuel_types.append("АИ-92")
            if "аи-95" in desc_lower or "аи 95" in desc_lower:
                fuel_types.append("АИ-95")
            if "аи-98" in desc_lower or "аи 98" in desc_lower:
                fuel_types.append("АИ-98")
            if "дизель" in desc_lower:
                fuel_types.append("ДТ")
            if "газ" in desc_lower or "lpg" in desc_lower:
                fuel_types.append("Газ")

            fuel_types = list(dict.fromkeys(fuel_types))

            features.append(
                {
                    "type": "Feature",
                    "id": item.get("id"),
                    "geometry": {
                        "type": "Point",
                        "coordinates": [item_lon, item_lat],
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