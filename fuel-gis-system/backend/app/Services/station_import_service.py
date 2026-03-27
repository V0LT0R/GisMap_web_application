import json
from typing import Iterable

from sqlalchemy.orm import Session

from app.models.station import Station
from app.services.dgis_service import DgisService


ASTANA_GRID_POINTS = [
    (51.1694, 71.4491),
    (51.1694, 71.4091),
    (51.1694, 71.4891),
    (51.1394, 71.4491),
    (51.1994, 71.4491),
    (51.1394, 71.4091),
    (51.1394, 71.4891),
    (51.1994, 71.4091),
    (51.1994, 71.4891),
    (51.1094, 71.4491),
    (51.2294, 71.4491),
    (51.1694, 71.3691),
    (51.1694, 71.5291),
    (51.1094, 71.3691),
    (51.1094, 71.5291),
    (51.2294, 71.3691),
    (51.2294, 71.5291),
]


class StationImportService:
    def __init__(self, db: Session):
        self.db = db
        self.dgis = DgisService()

    def _extract_point(self, item: dict) -> tuple[float | None, float | None]:
        point = item.get("point") or {}
        lat = point.get("lat")
        lon = point.get("lon")
        return lat, lon

    def _extract_rubrics(self, item: dict) -> str | None:
        rubrics = item.get("rubrics") or []
        if not rubrics:
            return None

        rubric_names = []
        for rubric in rubrics:
            if isinstance(rubric, dict):
                name = rubric.get("name")
                if name:
                    rubric_names.append(name)
            elif isinstance(rubric, str):
                rubric_names.append(rubric)

        return json.dumps(rubric_names, ensure_ascii=False) if rubric_names else None

    def _extract_schedule_text(self, item: dict) -> str | None:
        schedule = item.get("schedule")
        if isinstance(schedule, dict):
            if schedule.get("is_24x7"):
                return "24/7"
            return "Есть расписание"
        return None

    def _normalize_item(self, item: dict) -> dict:
        external_id = str(item.get("id"))
        lat, lon = self._extract_point(item)

        return {
            "external_id": external_id,
            "source": "2gis",
            "name": item.get("name"),
            "full_name": item.get("full_name"),
            "address_name": item.get("address_name"),
            "full_address_name": item.get("full_address_name"),
            "brand": item.get("brand"),
            "org_name": item.get("org_name"),
            "description": item.get("description"),
            "schedule_text_api": self._extract_schedule_text(item),
            "rubrics_json": self._extract_rubrics(item),
            "latitude": lat,
            "longitude": lon,
        }

    def _upsert_station(self, normalized: dict) -> tuple[Station, bool]:
        station = (
            self.db.query(Station)
            .filter(
                Station.external_id == normalized["external_id"],
                Station.source == normalized["source"],
            )
            .first()
        )

        created = False
        if not station:
            station = Station(**normalized)
            self.db.add(station)
            created = True
        else:
            station.name = normalized["name"]
            station.full_name = normalized["full_name"]
            station.address_name = normalized["address_name"]
            station.full_address_name = normalized["full_address_name"]
            station.brand = normalized["brand"]
            station.org_name = normalized["org_name"]
            station.description = normalized["description"]
            station.schedule_text_api = normalized["schedule_text_api"]
            station.rubrics_json = normalized["rubrics_json"]
            station.latitude = normalized["latitude"]
            station.longitude = normalized["longitude"]

        return station, created

    def import_from_grid(
        self,
        points: Iterable[tuple[float, float]] = ASTANA_GRID_POINTS,
        radius: int = 6000,
    ) -> dict:
        created_count = 0
        updated_count = 0
        seen_external_ids = set()

        for lat, lon in points:
            page = 1

            while True:
                data = self.dgis.search_gas_stations(
                    lat=lat,
                    lon=lon,
                    radius=radius,
                    page=page,
                    page_size=10,
                )

                result = data.get("result") or {}
                items = result.get("items") or []

                print(f"POINT lat={lat}, lon={lon}, page={page}, items_count={len(items)}")

                if not items:
                    break

                for item in items:
                    external_id = str(item.get("id"))
                    if not external_id or external_id in seen_external_ids:
                        continue

                    seen_external_ids.add(external_id)
                    normalized = self._normalize_item(item)
                    _, created = self._upsert_station(normalized)

                    if created:
                        created_count += 1
                    else:
                        updated_count += 1

                if len(items) < 10:
                    break

                page += 1

        self.db.commit()

        return {
            "created": created_count,
            "updated": updated_count,
            "total_processed": created_count + updated_count,
            "unique_seen": len(seen_external_ids),
        }