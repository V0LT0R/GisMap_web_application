"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { createClientAuditLog } from "@/lib/api/admin";
import { getMyStations } from "@/lib/api/stations";
import { getCurrentSessionUser } from "@/lib/auth/session";
import { getToken } from "@/lib/auth/token";
import type { UserMe } from "@/types/auth";
import type { StationListItem } from "@/types/station";

type DemandZone = {
  id: string;
  name: string;
  type: "residential" | "road" | "mixed" | "growth";
  lat: number;
  lon: number;
  demand: number;
  radiusKm: number;
  reason: string;
};

type ZoneRecommendation = DemandZone & {
  nearestStationKm: number | null;
  stationCountInRadius: number;
  score: number;
  priority: "high" | "medium" | "low";
  recommendation: string;
};

type PlannedStation = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  createdAt: string;
  ownerId?: number | null;
  ownerEmail?: string | null;
};

type OverpassNode = {
  type: "node";
  id: number;
  lat: number;
  lon: number;
};

type OverpassWay = {
  type: "way";
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
};

type OverpassResponse = {
  elements: Array<OverpassNode | OverpassWay>;
};

const PLANNED_STORAGE_KEY = "fuel-gis-planned-stations";
const ASTANA_CENTER: [number, number] = [71.4491, 51.1694];
const OSM_RASTER_MAX_ZOOM = 19;
const MAP_MAX_ZOOM = 19;

const ASTANA_BBOX = {
  south: 50.98,
  west: 71.25,
  north: 51.28,
  east: 71.65,
};

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

const DEMAND_ZONES: DemandZone[] = [
  {
    id: "expo-turan-east",
    name: "EXPO / Туран восток",
    type: "growth",
    lat: 51.0918,
    lon: 71.4318,
    demand: 9,
    radiusKm: 0.85,
    reason: "узкий коридор новых ЖК, EXPO и потока в сторону аэропорта",
  },
  {
    id: "expo-turan-west",
    name: "EXPO / Туран запад",
    type: "growth",
    lat: 51.0974,
    lon: 71.4016,
    demand: 8,
    radiusKm: 0.8,
    reason: "жилая застройка и поток по проспекту Туран",
  },
  {
    id: "uly-dala-north",
    name: "Улы Дала / северные ЖК",
    type: "residential",
    lat: 51.0975,
    lon: 71.4555,
    demand: 9,
    radiusKm: 0.9,
    reason: "плотные новые ЖК и недостаток равномерного покрытия АЗС",
  },
  {
    id: "uly-dala-south",
    name: "Улы Дала / южный коридор",
    type: "residential",
    lat: 51.0752,
    lon: 71.4564,
    demand: 8,
    radiusKm: 0.85,
    reason: "растущие жилые кварталы и движение к аэропорту",
  },
  {
    id: "mangilik-kabanbay-east",
    name: "Мангилик Ел / Кабанбай восток",
    type: "mixed",
    lat: 51.1088,
    lon: 71.4478,
    demand: 8,
    radiusKm: 0.75,
    reason: "основная дорога, университеты, офисы и жилые кварталы",
  },
  {
    id: "mangilik-kabanbay-west",
    name: "Мангилик Ел / Кабанбай запад",
    type: "mixed",
    lat: 51.1125,
    lon: 71.4108,
    demand: 8,
    radiusKm: 0.75,
    reason: "магистральный поток и высокая дневная активность",
  },
  {
    id: "sauran-syganak",
    name: "Сауран / Сыганак",
    type: "residential",
    lat: 51.1175,
    lon: 71.4057,
    demand: 8,
    radiusKm: 0.8,
    reason: "крупные жилые кварталы и ежедневные поездки жителей",
  },
  {
    id: "tauelsizdik-nazhimedenov",
    name: "Тәуелсіздік / Нажимеденова",
    type: "mixed",
    lat: 51.1328,
    lon: 71.4701,
    demand: 7,
    radiusKm: 0.75,
    reason: "жилые кварталы, административные объекты и городской поток",
  },
  {
    id: "left-bank-nurzhol",
    name: "Левый берег / Нуржол",
    type: "mixed",
    lat: 51.1262,
    lon: 71.4306,
    demand: 7,
    radiusKm: 0.75,
    reason: "административный центр, торговые объекты и дневной трафик",
  },
  {
    id: "korgalzhyn-highway-north",
    name: "Коргалжынское шоссе / север",
    type: "road",
    lat: 51.1904,
    lon: 71.3748,
    demand: 7,
    radiusKm: 0.9,
    reason: "выездная магистраль и поток в сторону пригородных зон",
  },
  {
    id: "saryarka-republic",
    name: "Сарыарка / Республика",
    type: "mixed",
    lat: 51.1714,
    lon: 71.4246,
    demand: 7,
    radiusKm: 0.75,
    reason: "пересечение городских потоков, торговля и офисная активность",
  },
  {
    id: "railway-station",
    name: "Район вокзала / старый центр",
    type: "mixed",
    lat: 51.1902,
    lon: 71.4099,
    demand: 6,
    radiusKm: 0.8,
    reason: "транспортный узел, такси, логистика и ежедневные поездки",
  },
  {
    id: "airport-road",
    name: "Трасса к аэропорту",
    type: "road",
    lat: 51.049441,
    lon: 71.432751,
    demand: 8,
    radiusKm: 0.95,
    reason: "магистральный поток к аэропорту и новым районам",
  },
  {
    id: "abylai-khan",
    name: "Абылай хана / Юго-Восток",
    type: "residential",
    lat: 51.1477,
    lon: 71.4895,
    demand: 7,
    radiusKm: 0.8,
    reason: "плотная жилая зона и стабильный локальный спрос",
  },
  {
    id: "koktal-bogenbay",
    name: "Көктал / Богенбай батыра",
    type: "growth",
    lat: 51.1918,
    lon: 71.3576,
    demand: 7,
    radiusKm: 0.85,
    reason: "развитие жилых массивов и выездной городской поток",
  },
  {
    id: "shabyt-qabanbay",
    name: "Qabanbay / Shabyt",
    type: "mixed",
    lat: 51.1179,
    lon: 71.4618,
    demand: 8,
    radiusKm: 0.75,
    reason: "деловая активность, учебные корпуса и высокий поток по магистрали",
  },
];

async function loadAstanaMajorRoads() {
  const query = `
    [out:json][timeout:25];
    (
      way["highway"~"motorway|trunk|primary|secondary"]
        (${ASTANA_BBOX.south},${ASTANA_BBOX.west},${ASTANA_BBOX.north},${ASTANA_BBOX.east});
    );
    (._;>;);
    out body;
  `;

  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    body: query,
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
    },
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить основные дороги");
  }

  const data = (await response.json()) as OverpassResponse;
  const nodes = new Map<number, [number, number]>();

  data.elements.forEach((element) => {
    if (element.type === "node") {
      nodes.set(element.id, [element.lon, element.lat]);
    }
  });

  const features = data.elements
    .filter((element): element is OverpassWay => element.type === "way")
    .map((way) => {
      const coordinates = way.nodes
        .map((nodeId) => nodes.get(nodeId))
        .filter(Boolean) as [number, number][];

      if (coordinates.length < 2) return null;

      return {
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates,
        },
        properties: {
          id: way.id,
          name: way.tags?.["name:ru"] || way.tags?.name || "Основная дорога",
          highway: way.tags?.highway || "road",
        },
      };
    })
    .filter(Boolean);

  return {
    type: "FeatureCollection" as const,
    features,
  };
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function createCircleFeature(
  lon: number,
  lat: number,
  radiusKm: number,
  properties: Record<string, unknown>,
  points = 72
) {
  const coords: [number, number][] = [];
  const distanceX = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i < points; i += 1) {
    const theta = (i / points) * (2 * Math.PI);
    coords.push([lon + distanceX * Math.cos(theta), lat + distanceY * Math.sin(theta)]);
  }

  coords.push(coords[0]);

  return {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: [coords],
    },
    properties,
  };
}

function loadAllPlannedStations(): PlannedStation[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(PLANNED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlannedStation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function filterVisiblePlannedStations(items: PlannedStation[], user: UserMe | null): PlannedStation[] {
  if (!user) return [];
  if (user.role === "super_admin") return items;
  return items.filter((item) => item.ownerId === user.id || (!item.ownerId && item.ownerEmail === user.email));
}

function saveAllPlannedStations(items: PlannedStation[]) {
  window.localStorage.setItem(PLANNED_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("fuel-gis-planned-stations-updated"));
}


function logPlannedStationAudit(
  item: PlannedStation,
  source: "manual_map_click" | "recommended_zone",
  zone?: ZoneRecommendation
) {
  const token = getToken();
  if (!token) return;

  createClientAuditLog(token, {
    action: "planned_station_create",
    entity_type: "planned_station",
    entity_id: item.id,
    description: `Добавлена будущая АЗС: ${item.name}`,
    meta: {
      planned_station_id: item.id,
      name: item.name,
      latitude: item.lat,
      longitude: item.lon,
      source,
      owner_id: item.ownerId ?? null,
      owner_email: item.ownerEmail ?? null,
      zone_id: zone?.id ?? null,
      zone_name: zone?.name ?? null,
      zone_score: zone?.score ?? null,
      zone_priority: zone?.priority ?? null,
    },
  }).catch((err) => {
    console.warn("Planned station audit log error:", err);
  });
}

function buildScore(zone: DemandZone, stations: StationListItem[]): ZoneRecommendation {
  const stationDistances = stations
    .filter((station) => station.latitude != null && station.longitude != null)
    .map((station) =>
      getDistanceKm(zone.lat, zone.lon, Number(station.latitude), Number(station.longitude))
    )
    .sort((a, b) => a - b);

  const nearestStationKm = stationDistances.length > 0 ? stationDistances[0] : null;
  const stationCountInRadius = stationDistances.filter((distance) => distance <= zone.radiusKm).length;
  const nearestNormalized = nearestStationKm == null ? 1 : Math.min(nearestStationKm / 3, 1);
  const demandNormalized = zone.demand / 10;
  const densityNormalized = Math.min(stationCountInRadius / 5, 1);
  const roadAccessibility = zone.type === "road" ? 1 : zone.type === "mixed" ? 0.86 : 0.62;
  const growthFactor = zone.type === "growth" ? 1 : zone.type === "residential" ? 0.82 : 0.72;

  // Lightweight ML-like scoring model for diploma demonstration.
  // Coefficients imitate a trained regression/ranking model and can later be replaced
  // by LightGBM/XGBoost coefficients trained on real traffic, sales and POI data.
  const mlScore =
    0.38 * demandNormalized +
    0.22 * nearestNormalized +
    0.18 * roadAccessibility +
    0.16 * growthFactor -
    0.26 * densityNormalized;

  const score = Math.max(0, Math.min(100, Math.round(mlScore * 100)));

  let priority: ZoneRecommendation["priority"] = "low";
  if (score >= 75) priority = "high";
  else if (score >= 52) priority = "medium";

  const recommendation =
    priority === "high"
      ? "Лучший кандидат для новой АЗС"
      : priority === "medium"
        ? "Перспективная зона, нужна проверка участка"
        : "Спрос есть, но рядом уже достаточно АЗС";

  return {
    ...zone,
    nearestStationKm,
    stationCountInRadius,
    score,
    priority,
    recommendation,
  };
}

function zoneTypeLabel(type: DemandZone["type"]) {
  if (type === "residential") return "ЖК / жилая зона";
  if (type === "road") return "Основная дорога";
  if (type === "growth") return "Зона роста";
  return "Смешанная зона";
}

function priorityLabel(priority: ZoneRecommendation["priority"]) {
  if (priority === "high") return "Высокий";
  if (priority === "medium") return "Средний";
  return "Низкий";
}

function priorityColor(priority: ZoneRecommendation["priority"]) {
  if (priority === "high") return "#16a34a";
  if (priority === "medium") return "#f59e0b";
  return "#64748b";
}

export default function ExpansionMap() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const stationMarkersRef = useRef<maplibregl.Marker[]>([]);
  const zoneMarkersRef = useRef<maplibregl.Marker[]>([]);
  const plannedMarkersRef = useRef<maplibregl.Marker[]>([]);

  const [user, setUser] = useState<UserMe | null>(null);
  const [stations, setStations] = useState<StationListItem[]>([]);
  const [plannedStations, setPlannedStations] = useState<PlannedStation[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPickMode, setIsPickMode] = useState(false);
  const [manualName, setManualName] = useState("Новая АЗС");

  const isPickModeRef = useRef(false);
  const manualNameRef = useRef("Новая АЗС");
  const userRef = useRef<UserMe | null>(null);

  const recommendations = useMemo(() => {
    return DEMAND_ZONES.map((zone) => buildScore(zone, stations)).sort((a, b) => b.score - a.score);
  }, [stations]);

  const selectedZone = useMemo(() => {
    return recommendations.find((zone) => zone.id === selectedZoneId) || recommendations[0] || null;
  }, [recommendations, selectedZoneId]);

  const bestZones = recommendations.filter((zone) => zone.priority !== "low");

  const averageScore = recommendations.length
    ? Math.round(recommendations.reduce((sum, zone) => sum + zone.score, 0) / recommendations.length)
    : 0;

  useEffect(() => {
    const loadStations = async () => {
      const token = getToken();

      if (!token) {
        setError("Не найден токен авторизации");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const currentUser = await getCurrentSessionUser();
        setUser(currentUser);
        setPlannedStations(filterVisiblePlannedStations(loadAllPlannedStations(), currentUser));
        const data = await getMyStations(token);
        setStations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить АЗС");
      } finally {
        setLoading(false);
      }
    };

    loadStations();
  }, []);

  useEffect(() => {
    if (!user) return;
    const syncPlannedStations = () => {
      setPlannedStations(filterVisiblePlannedStations(loadAllPlannedStations(), user));
    };

    window.addEventListener("storage", syncPlannedStations);
    window.addEventListener("fuel-gis-planned-stations-updated", syncPlannedStations);

    return () => {
      window.removeEventListener("storage", syncPlannedStations);
      window.removeEventListener("fuel-gis-planned-stations-updated", syncPlannedStations);
    };
  }, [user]);

  useEffect(() => {
    isPickModeRef.current = isPickMode;

    const map = mapRef.current;
    if (map) {
      map.getCanvas().style.cursor = isPickMode ? "crosshair" : "";
    }
  }, [isPickMode]);

  useEffect(() => {
    manualNameRef.current = manualName;
  }, [manualName]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: "raster",
            tiles: [
              "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
              "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            maxzoom: OSM_RASTER_MAX_ZOOM,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "osm",
            type: "raster",
            source: "osm",
          },
        ],
      },
      center: ASTANA_CENTER,
      zoom: 11.2,
      maxZoom: MAP_MAX_ZOOM,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      map.addSource("major-roads", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "major-roads-line",
        type: "line",
        source: "major-roads",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": [
            "match",
            ["get", "highway"],
            "motorway",
            "#16a34a",
            "trunk",
            "#22c55e",
            "primary",
            "#2563eb",
            "secondary",
            "#f59e0b",
            "#64748b",
          ],
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 2, 12, 4, 14, 7],
          "line-opacity": 0.75,
        },
      });

      loadAstanaMajorRoads()
        .then((roadGeoJson) => {
          const source = map.getSource("major-roads") as GeoJSONSource | undefined;
          source?.setData(roadGeoJson as never);
        })
        .catch((err) => {
          console.warn("Major roads loading error, fallback roads used:", err);
          const fallbackRoads = {
            type: "FeatureCollection",
            features: [
              { type: "Feature", geometry: { type: "LineString", coordinates: [[71.344, 51.158], [71.39, 51.135], [71.431, 51.115], [71.474, 51.093], [71.52, 51.07]] }, properties: { name: "проспект Кабанбай Батыра", highway: "primary" } },
              { type: "Feature", geometry: { type: "LineString", coordinates: [[71.371, 51.202], [71.404, 51.177], [71.431, 51.151], [71.452, 51.126], [71.472, 51.097]] }, properties: { name: "проспект Сарыарка", highway: "primary" } },
              { type: "Feature", geometry: { type: "LineString", coordinates: [[71.395, 51.106], [71.425, 51.121], [71.462, 51.14], [71.507, 51.164]] }, properties: { name: "проспект Мәңгілік Ел", highway: "trunk" } },
            ],
          };
          const source = map.getSource("major-roads") as GeoJSONSource | undefined;
          source?.setData(fallbackRoads as never);
        });

      map.addSource("recommendation-zones", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "recommendation-zones-fill",
        type: "fill",
        source: "recommendation-zones",
        paint: {
          "fill-color": [
            "match",
            ["get", "priority"],
            "high",
            "#16a34a",
            "medium",
            "#f59e0b",
            "#64748b",
          ],
          "fill-opacity": 0.18,
        },
      });

      map.addLayer({
        id: "recommendation-zones-line",
        type: "line",
        source: "recommendation-zones",
        paint: {
          "line-color": [
            "match",
            ["get", "priority"],
            "high",
            "#16a34a",
            "medium",
            "#f59e0b",
            "#64748b",
          ],
          "line-width": 2,
          "line-opacity": 0.9,
        },
      });
    });

    map.on("click", (event) => {
      if (!isPickModeRef.current) return;

      const currentUser = userRef.current;
      const newItem: PlannedStation = {
        id: `planned-${Date.now()}`,
        name: manualNameRef.current.trim() || "Новая АЗС",
        lon: Number(event.lngLat.lng.toFixed(6)),
        lat: Number(event.lngLat.lat.toFixed(6)),
        createdAt: new Date().toISOString(),
        ownerId: currentUser?.id ?? null,
        ownerEmail: currentUser?.email ?? null,
      };

      const allItems = loadAllPlannedStations();
      const nextAll = [...allItems, newItem];
      saveAllPlannedStations(nextAll);
      setPlannedStations(filterVisiblePlannedStations(nextAll, currentUser));
      logPlannedStationAudit(newItem, "manual_map_click");

      setIsPickMode(false);
    });

    mapRef.current = map;

    return () => {
      stationMarkersRef.current.forEach((marker) => marker.remove());
      zoneMarkersRef.current.forEach((marker) => marker.remove());
      plannedMarkersRef.current.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateZones = () => {
      const source = map.getSource("recommendation-zones") as GeoJSONSource | undefined;
      if (!source) return;

      source.setData({
        type: "FeatureCollection",
        features: recommendations.map((zone) =>
          createCircleFeature(zone.lon, zone.lat, zone.radiusKm, {
            id: zone.id,
            name: zone.name,
            priority: zone.priority,
            score: zone.score,
          })
        ),
      } as never);
    };

    if (map.isStyleLoaded()) updateZones();
    map.once("idle", updateZones);
  }, [recommendations]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    stationMarkersRef.current.forEach((marker) => marker.remove());
    stationMarkersRef.current = [];

    stations.forEach((station) => {
      if (station.latitude == null || station.longitude == null) return;

      const markerElement = document.createElement("div");
      markerElement.className = "expansion-station-marker";
      markerElement.title = station.name || "АЗС";

      const popup = new maplibregl.Popup({ offset: 18 }).setHTML(`
        <div style="font-family:Arial,sans-serif;min-width:190px;">
          <div style="font-weight:800;margin-bottom:6px;">${station.name || "АЗС"}</div>
          <div style="font-size:13px;color:#475569;">
            ${station.full_address_name || station.address_name || "Адрес не указан"}
          </div>
          <div style="font-size:13px;margin-top:6px;">Колонки: ${station.columns_count ?? "-"}</div>
        </div>
      `);

      const marker = new maplibregl.Marker({ element: markerElement })
        .setLngLat([station.longitude, station.latitude])
        .setPopup(popup)
        .addTo(map);

      stationMarkersRef.current.push(marker);
    });
  }, [stations]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    zoneMarkersRef.current.forEach((marker) => marker.remove());
    zoneMarkersRef.current = [];

    recommendations.forEach((zone) => {
      const markerElement = document.createElement("button");
      markerElement.type = "button";
      markerElement.className = `expansion-zone-marker ${zone.priority}`;
      markerElement.innerHTML = `<span>${zone.score}</span>`;
      markerElement.title = zone.name;

      markerElement.addEventListener("click", () => {
        setSelectedZoneId(zone.id);
        map.flyTo({ center: [zone.lon, zone.lat], zoom: 13.2, duration: 700 });
      });

      const marker = new maplibregl.Marker({ element: markerElement })
        .setLngLat([zone.lon, zone.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 18 }).setHTML(`
            <div style="font-family:Arial,sans-serif;min-width:220px;">
              <div style="font-weight:800;margin-bottom:6px;">${zone.name}</div>
              <div>Балл: <b>${zone.score}/100</b></div>
              <div>Приоритет: <b>${priorityLabel(zone.priority)}</b></div>
              <div style="margin-top:6px;color:#475569;">${zone.recommendation}</div>
            </div>
          `)
        )
        .addTo(map);

      zoneMarkersRef.current.push(marker);
    });
  }, [recommendations]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    plannedMarkersRef.current.forEach((marker) => marker.remove());
    plannedMarkersRef.current = [];

    plannedStations.forEach((station) => {
      const markerElement = document.createElement("div");
      markerElement.className = "planned-station-marker";
      markerElement.innerHTML = `<span>⛽</span><strong>${station.name}</strong>`;

      const marker = new maplibregl.Marker({ element: markerElement })
        .setLngLat([station.lon, station.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 20 }).setHTML(`
            <div style="font-family:Arial,sans-serif;min-width:210px;">
              <div style="font-weight:800;margin-bottom:6px;">${station.name}</div>
              <div style="color:#16a34a;font-weight:700;">Скоро появится</div>
              <div style="font-size:12px;color:#64748b;margin-top:6px;">
                ${station.lat}, ${station.lon}
              </div>
              ${station.ownerEmail ? `<div style="font-size:12px;color:#64748b;margin-top:4px;">Добавил: ${station.ownerEmail}</div>` : ""}
            </div>
          `)
        )
        .addTo(map);

      plannedMarkersRef.current.push(marker);
    });
  }, [plannedStations]);

  const focusZone = (zone: ZoneRecommendation) => {
    setSelectedZoneId(zone.id);
    mapRef.current?.flyTo({ center: [zone.lon, zone.lat], zoom: 13.2, duration: 700 });
  };

  const addBestZoneAsPlanned = () => {
    const zone = selectedZone;
    if (!zone) return;

    const currentUser = userRef.current;
    const newItem: PlannedStation = {
      id: `planned-${Date.now()}`,
      name: manualNameRef.current.trim() || `Новая АЗС: ${zone.name}`,
      lat: zone.lat,
      lon: zone.lon,
      createdAt: new Date().toISOString(),
      ownerId: currentUser?.id ?? null,
      ownerEmail: currentUser?.email ?? null,
    };

    const allItems = loadAllPlannedStations();
    const nextAll = [...allItems, newItem];
    saveAllPlannedStations(nextAll);
    setPlannedStations(filterVisiblePlannedStations(nextAll, currentUser));
    logPlannedStationAudit(newItem, "recommended_zone", zone);
  };

  const removePlannedStation = (id: string) => {
    const currentUser = userRef.current;
    const nextAll = loadAllPlannedStations().filter((item) => item.id !== id);
    saveAllPlannedStations(nextAll);
    setPlannedStations(filterVisiblePlannedStations(nextAll, currentUser));
  };

  const clearPlannedStations = () => {
    const currentUser = userRef.current;
    const allItems = loadAllPlannedStations();
    const nextAll = currentUser?.role === "super_admin"
      ? []
      : allItems.filter((item) => item.ownerId !== currentUser?.id && item.ownerEmail !== currentUser?.email);
    saveAllPlannedStations(nextAll);
    setPlannedStations(filterVisiblePlannedStations(nextAll, currentUser));
  };

  return (
    <div className="expansion-page">
      <div className="expansion-header">
        <div>
          <div className="expansion-kicker">Аналитика расширения сети</div>
          <h2>Рекомендации для новых АЗС в Астане</h2>
          <p>
            Карта сравнивает текущие АЗС, крупные жилые зоны, основные дорожные оси и зоны,
            где новая станция может снизить нагрузку.
          </p>
        </div>

        <div className="expansion-actions">
          <button className="btn btn-primary" onClick={addBestZoneAsPlanned} disabled={!selectedZone}>
            Добавить выбранную зону
          </button>

          <button
            className={`btn ${isPickMode ? "btn-success" : "btn-outline-primary"}`}
            onClick={() => setIsPickMode((value) => !value)}
          >
            {isPickMode ? "Кликни по карте" : "Поставить точку вручную"}
          </button>
        </div>
      </div>

      <div className="expansion-stats">
        <div className="expansion-stat-card">
          <span>Мои АЗС</span>
          <strong>{stations.length}</strong>
        </div>

        <div className="expansion-stat-card">
          <span>Перспективные зоны</span>
          <strong>{bestZones.length}</strong>
        </div>

        <div className="expansion-stat-card">
          <span>Средний потенциал</span>
          <strong>{averageScore}/100</strong>
        </div>

        <div className="expansion-stat-card">
          <span>{user?.role === "super_admin" ? "Все будущие точки" : "Мои будущие точки"}</span>
          <strong>{plannedStations.length}</strong>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="alert alert-info">Загрузка данных...</div>}

      <div className="expansion-workspace">
        <aside className="expansion-panel">
          <div className="expansion-panel-section">
            <h3>Как считается зона</h3>
            <div className="expansion-formula">
              ML-score = спрос + удаленность от конкурентов + доступность дорог + рост района − плотность АЗС
            </div>
            <p>
              В проект добавлена lightweight ML-like модель ранжирования. Сейчас она использует нормализованные
              признаки зоны и веса модели, а позже может быть заменена LightGBM/XGBoost на реальных данных.
            </p>
          </div>

          <div className="expansion-panel-section">
            <label className="form-label">Название будущей АЗС</label>
            <input
              className="form-control"
              value={manualName}
              onChange={(event) => setManualName(event.target.value)}
              placeholder="Например: Qazaq Oil EXPO или АЗС возле нового ЖК"
            />
          </div>

          <div className="expansion-panel-section">
            <h3>Лучшие зоны</h3>
            <div className="expansion-zone-list">
              {recommendations.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  className={`expansion-zone-card ${selectedZone?.id === zone.id ? "active" : ""}`}
                  onClick={() => focusZone(zone)}
                >
                  <div className="zone-card-top">
                    <span className="zone-score" style={{ backgroundColor: priorityColor(zone.priority) }}>
                      {zone.score}
                    </span>

                    <div>
                      <strong>{zone.name}</strong>
                      <small>{zoneTypeLabel(zone.type)}</small>
                    </div>
                  </div>

                  <p>{zone.reason}</p>

                  <div className="zone-card-meta">
                    <span>
                      Ближайшая АЗС:{" "}
                      {zone.nearestStationKm == null ? "-" : `${zone.nearestStationKm.toFixed(1)} км`}
                    </span>
                    <span>В радиусе: {zone.stationCountInRadius}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="expansion-map-card">
          <div className="expansion-map-toolbar">
            <div className="expansion-legend">
              <span>
                <i className="legend-dot station" /> Текущие АЗС
              </span>
              <span>
                <i className="legend-dot high" /> Высокий приоритет
              </span>
              <span>
                <i className="legend-dot medium" /> Средний приоритет
              </span>
              <span>
                <i className="legend-line" /> Основные дороги
              </span>
              <span>
                <i className="legend-dot planned" /> Скоро появится
              </span>
            </div>
          </div>

          <div ref={mapContainerRef} className="expansion-map" />
        </section>

        <aside className="expansion-panel right">
          <div className="expansion-panel-section">
            <h3>Выбранная зона</h3>

            {selectedZone ? (
              <div className="selected-zone-box">
                <div className="selected-score" style={{ color: priorityColor(selectedZone.priority) }}>
                  {selectedZone.score}/100
                </div>

                <h4>{selectedZone.name}</h4>
                <div className="selected-priority">Приоритет: {priorityLabel(selectedZone.priority)}</div>

                <p>{selectedZone.recommendation}</p>

                <ul>
                  <li>Тип: {zoneTypeLabel(selectedZone.type)}</li>
                  <li>
                    Ближайшая АЗС:{" "}
                    {selectedZone.nearestStationKm == null
                      ? "-"
                      : `${selectedZone.nearestStationKm.toFixed(2)} км`}
                  </li>
                  <li>АЗС рядом: {selectedZone.stationCountInRadius}</li>
                  <li>Радиус анализа: {selectedZone.radiusKm} км</li>
                </ul>
              </div>
            ) : (
              <div className="text-muted">Зона не выбрана</div>
            )}
          </div>

          <div className="expansion-panel-section">
            <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
              <h3 className="mb-0">Будущие АЗС</h3>

              {plannedStations.length > 0 && (
                <button className="btn btn-sm btn-outline-danger" onClick={clearPlannedStations}>
                  Очистить
                </button>
              )}
            </div>

            {plannedStations.length === 0 ? (
              <p className="text-muted mb-0">
                Пока нет точек. Добавь лучшую зону или поставь точку вручную на карте.
              </p>
            ) : (
              <div className="planned-list">
                {plannedStations.map((station) => (
                  <div key={station.id} className="planned-item">
                    <div>
                      <strong>{station.name}</strong>
                      <small>
                        {station.lat}, {station.lon}
                        {user?.role === "super_admin" && station.ownerEmail ? ` · ${station.ownerEmail}` : ""}
                      </small>
                    </div>

                    <button className="btn btn-sm btn-outline-secondary" onClick={() => removePlannedStation(station.id)}>
                      Удалить
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="expansion-panel-section muted-box">
            <h3>ML-модель рекомендаций</h3>
            <p>
              Модель ранжирует зоны по спросу, дорожной доступности, удаленности от конкурентов, типу района
              и плотности существующих АЗС. Для production-обучения нужны: 2GIS POI/ЖК, OSM дороги,
              население по районам, исторические продажи топлива, трафик и цены конкурентов.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}