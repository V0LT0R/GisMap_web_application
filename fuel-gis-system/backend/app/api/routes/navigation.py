import math
import re
from typing import Literal

import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.config import settings

router = APIRouter(prefix="/api/navigation", tags=["navigation"])


class RoutePoint(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)


class RouteRequest(BaseModel):
    start: RoutePoint
    end: RoutePoint
    transport: Literal["driving", "walking"] = "driving"


def _parse_linestring(value: str) -> list[list[float]]:
    """Convert WKT LINESTRING(lon lat, lon lat) to GeoJSON coordinates."""
    match = re.search(r"LINESTRING\s*\(([^)]+)\)", value or "", re.IGNORECASE)
    if not match:
        return []

    coords: list[list[float]] = []
    for pair in match.group(1).split(","):
        parts = pair.strip().split()
        if len(parts) < 2:
            continue
        try:
            lon = float(parts[0])
            lat = float(parts[1])
        except ValueError:
            continue
        coords.append([lon, lat])
    return coords


def _extract_route_geometry(route: dict) -> list[list[float]]:
    coords: list[list[float]] = []

    for key in ("begin_pedestrian_path", "end_pedestrian_path"):
        selection = ((route.get(key) or {}).get("geometry") or {}).get("selection")
        coords.extend(_parse_linestring(selection))

    for maneuver in route.get("maneuvers") or []:
        outcoming_path = maneuver.get("outcoming_path") or {}
        for geometry_item in outcoming_path.get("geometry") or []:
            coords.extend(_parse_linestring(geometry_item.get("selection") or ""))

    deduped: list[list[float]] = []
    for coord in coords:
        if not deduped or deduped[-1] != coord:
            deduped.append(coord)
    return deduped


def _haversine_m(start: RoutePoint, end: RoutePoint) -> float:
    radius_m = 6371000
    d_lat = math.radians(end.lat - start.lat)
    d_lon = math.radians(end.lon - start.lon)
    lat1 = math.radians(start.lat)
    lat2 = math.radians(end.lat)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(d_lon / 2) ** 2
    )
    return radius_m * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _fallback_straight_route(payload: RouteRequest, warning: str | None = None):
    distance_m = _haversine_m(payload.start, payload.end)
    # Примерная оценка времени, чтобы карточка не оставалась пустой.
    speed_kmh = 5 if payload.transport == "walking" else 35
    duration_s = int(distance_m / (speed_kmh * 1000 / 3600))
    return {
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [payload.start.lon, payload.start.lat],
                [payload.end.lon, payload.end.lat],
            ],
        },
        "distance_m": round(distance_m),
        "duration_s": duration_s,
        "ui_distance": None,
        "ui_duration": None,
        "route_source": "fallback_straight",
        "warning": warning,
    }


def _build_osrm_route(payload: RouteRequest, warning: str | None = None):
    profile = "walking" if payload.transport == "walking" else "driving"
    url = (
        "https://router.project-osrm.org/route/v1/"
        f"{profile}/{payload.start.lon},{payload.start.lat};{payload.end.lon},{payload.end.lat}"
    )

    try:
        response = requests.get(
            url,
            params={"overview": "full", "geometries": "geojson"},
            timeout=15,
        )
        if response.status_code >= 400:
            return _fallback_straight_route(payload, warning or f"OSRM routing error: {response.status_code}")

        data = response.json()
        routes = data.get("routes") or []
        if not routes:
            return _fallback_straight_route(payload, warning or "OSRM route not found")

        route = routes[0]
        return {
            "geometry": route.get("geometry") or {
                "type": "LineString",
                "coordinates": [
                    [payload.start.lon, payload.start.lat],
                    [payload.end.lon, payload.end.lat],
                ],
            },
            "distance_m": route.get("distance"),
            "duration_s": route.get("duration"),
            "ui_distance": None,
            "ui_duration": None,
            "route_source": "osrm",
            "warning": warning,
        }
    except requests.RequestException:
        return _fallback_straight_route(payload, warning or "OSRM routing service is unavailable")


@router.post("/route")
def build_route(payload: RouteRequest):
    if not settings.DGIS_API_KEY:
        # Маршрут всё равно строится через резервный сервис, а не падает 500.
        return _build_osrm_route(payload, "DGIS_API_KEY is not configured")

    # В 2GIS Routing API транспорт для машины называется car, а не driving.
    dgis_transport = "walking" if payload.transport == "walking" else "car"

    try:
        response = requests.post(
            "https://routing.api.2gis.com/routing/7.0.0/global",
            params={"key": settings.DGIS_API_KEY},
            json={
                "points": [
                    {"type": "stop", "lon": payload.start.lon, "lat": payload.start.lat},
                    {"type": "stop", "lon": payload.end.lon, "lat": payload.end.lat},
                ],
                "transport": dgis_transport,
                "route_mode": "fastest",
                "traffic_mode": "jam",
                "locale": "ru",
            },
            timeout=15,
        )
    except requests.RequestException:
        return _build_osrm_route(payload, "2GIS routing service is unavailable")

    if response.status_code == 403:
        # У ключа 2GIS нет доступа к Routing API. Не ломаем интерфейс — строим резервный маршрут.
        return _build_osrm_route(payload, "2GIS routing access is forbidden for this API key")

    if response.status_code >= 400:
        return _build_osrm_route(payload, f"2GIS routing error: {response.status_code}")

    try:
        data = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="2GIS returned invalid JSON") from exc

    routes = data.get("result") or []
    if not routes:
        return _build_osrm_route(payload, "2GIS route not found")

    route = routes[0]
    geometry = _extract_route_geometry(route)
    if len(geometry) < 2:
        geometry = [
            [payload.start.lon, payload.start.lat],
            [payload.end.lon, payload.end.lat],
        ]

    return {
        "geometry": {"type": "LineString", "coordinates": geometry},
        "distance_m": route.get("total_distance"),
        "duration_s": route.get("total_duration"),
        "ui_distance": route.get("ui_total_distance"),
        "ui_duration": route.get("ui_total_duration"),
        "route_source": "2gis",
        "warning": None,
    }
