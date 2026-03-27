"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import SearchInput from "@/components/common/SearchInput";
import { getStationPublicById, getStations } from "@/lib/api/stations";
import type { StationFull, StationListItem } from "@/types/station";

type UserLocation = {
  latitude: number;
  longitude: number;
};

const FUEL_LABELS: Record<string, string> = {
  AI_80: "АИ-80",
  AI_92: "АИ-92",
  AI_95: "АИ-95",
  AI_98: "АИ-98",
  DT: "ДТ",
  GAS: "Газ",
  LPG: "LPG",
  EV: "Электро",
};

function getStationGroup(station: StationListItem): string {
  if (station.brand && station.brand.trim()) {
    return station.brand.trim();
  }

  const rawName = (station.name || "").trim();
  if (!rawName) return "Без бренда";

  return rawName.split(",")[0].trim() || "Без бренда";
}

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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

function createCircleGeoJSON(
  centerLng: number,
  centerLat: number,
  radiusKm: number,
  points = 64
) {
  const coords: [number, number][] = [];
  const distanceX = radiusKm / (111.32 * Math.cos((centerLat * Math.PI) / 180));
  const distanceY = radiusKm / 110.574;

  for (let i = 0; i < points; i += 1) {
    const theta = (i / points) * (2 * Math.PI);
    const x = distanceX * Math.cos(theta);
    const y = distanceY * Math.sin(theta);
    coords.push([centerLng + x, centerLat + y]);
  }

  coords.push(coords[0]);

  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [coords],
    },
    properties: {},
  };
}

function buildFuelHtml(data: StationFull) {
  if (!data.fuels || data.fuels.length === 0) {
    return `<div style="margin-top:10px;color:#6b7280;">Данные по топливу не добавлены</div>`;
  }

  const items = data.fuels
    .map((fuel) => {
      const price =
        fuel.price !== null && fuel.price !== undefined
          ? `${fuel.price} ₸/л`
          : "-";

      return `
        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:6px 0;
          border-bottom:1px solid #f1f5f9;
          font-size:14px;
          gap:12px;
        ">
          <span style="font-weight:600;">${fuel.name}</span>
          <span style="font-weight:500; color:#111827; white-space:nowrap;">${price}</span>
        </div>
      `;
    })
    .join("");

  return `
    <div style="margin-top:12px;">
      <div style="font-weight:700;margin-bottom:6px;">Топливо и цены</div>
      <div>${items}</div>
    </div>
  `;
}

function buildPopupHtml(data: StationFull) {
  return `
    <div style="
      min-width:120px;
      max-width:220px;
      font-family:Arial, sans-serif;
      font-size:14px;
      color:#111827;
    ">
      <div style="font-size:18px;font-weight:700;margin-bottom:10px;">
        ${data.station.name || "АЗС"}
      </div>

      <div style="margin-bottom:6px;">
        <strong>Адрес:</strong> ${data.station.full_address_name || data.station.address_name || "-"}
      </div>

      <div style="margin-bottom:6px;">
        <strong>Работает:</strong> ${data.details.is_operational ? "Да" : "Нет"}
      </div>

      <div style="margin-bottom:6px;">
        <strong>Часы:</strong> ${data.details.working_hours || data.station.schedule_text_api || "-"}
      </div>

      <div style="margin-bottom:6px;">
        <strong>Колонки:</strong> ${data.details.columns_count ?? "-"}
      </div>

      ${buildFuelHtml(data)}
    </div>
  `;
}

export default function MapContainer() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  const [stations, setStations] = useState<StationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [geoError, setGeoError] = useState("");
  const [radiusKm, setRadiusKm] = useState(5);

  const [selectedFuelCodes, setSelectedFuelCodes] = useState<string[]>([]);
  const [selectedStationGroups, setSelectedStationGroups] = useState<string[]>(
    []
  );
  const [fuelSearch, setFuelSearch] = useState("");
  const [stationGroupSearch, setStationGroupSearch] = useState("");

  const [selectedStation, setSelectedStation] = useState<StationFull | null>(
    null
  );
  const [selectedStationLoading, setSelectedStationLoading] = useState(false);

  useEffect(() => {
    const loadStations = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getStations();
        setStations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки станций");
      } finally {
        setLoading(false);
      }
    };

    loadStations();
  }, []);

  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Геолокация не поддерживается браузером");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoError("");
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        setGeoError("Не удалось определить геолокацию");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  useEffect(() => {
    requestUserLocation();
  }, []);

  const availableFuelCodes = useMemo(() => {
    const set = new Set<string>();
    stations.forEach((station) => {
      station.fuel_codes?.forEach((code) => set.add(code));
    });
    return Array.from(set).sort();
  }, [stations]);

  const availableStationGroups = useMemo(() => {
    const set = new Set<string>();
    stations.forEach((station) => {
      set.add(getStationGroup(station));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [stations]);

  const filteredFuelCodes = useMemo(() => {
    const query = fuelSearch.trim().toLowerCase();
    if (!query) return availableFuelCodes;

    return availableFuelCodes.filter((code) => {
      const label = (FUEL_LABELS[code] || code).toLowerCase();
      return label.includes(query) || code.toLowerCase().includes(query);
    });
  }, [availableFuelCodes, fuelSearch]);

  const filteredStationGroupsForFilter = useMemo(() => {
    const query = stationGroupSearch.trim().toLowerCase();
    if (!query) return availableStationGroups;

    return availableStationGroups.filter((group) =>
      group.toLowerCase().includes(query)
    );
  }, [availableStationGroups, stationGroupSearch]);

  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      if (station.latitude == null || station.longitude == null) return false;

      if (userLocation) {
        const distance = getDistanceKm(
          userLocation.latitude,
          userLocation.longitude,
          station.latitude,
          station.longitude
        );
        if (distance > radiusKm) return false;
      }

      if (selectedFuelCodes.length > 0) {
        const codes = station.fuel_codes || [];
        const hasFuel = selectedFuelCodes.every((code) => codes.includes(code));
        if (!hasFuel) return false;
      }

      if (selectedStationGroups.length > 0) {
        const group = getStationGroup(station);
        if (!selectedStationGroups.includes(group)) return false;
      }

      return true;
    });
  }, [stations, userLocation, radiusKm, selectedFuelCodes, selectedStationGroups]);

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
      center: [71.4491, 51.1694],
      zoom: 11.5,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      if (!map.getSource("search-radius")) {
        map.addSource("search-radius", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });

        map.addLayer({
          id: "search-radius-fill",
          type: "fill",
          source: "search-radius",
          paint: {
            "fill-color": "#2563eb",
            "fill-opacity": 0.08,
          },
        });

        map.addLayer({
          id: "search-radius-line",
          type: "line",
          source: "search-radius",
          paint: {
            "line-color": "#2563eb",
            "line-width": 2,
            "line-opacity": 0.7,
          },
        });
      }
    });

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation) return;

    userMarkerRef.current?.remove();

    const outer = document.createElement("div");
    outer.style.width = "34px";
    outer.style.height = "34px";
    outer.style.borderRadius = "50%";
    outer.style.background = "rgba(37, 99, 235, 0.18)";
    outer.style.border = "2px solid rgba(37, 99, 235, 0.35)";
    outer.style.display = "flex";
    outer.style.alignItems = "center";
    outer.style.justifyContent = "center";
    outer.style.boxShadow = "0 0 12px rgba(37,99,235,0.25)";

    const inner = document.createElement("div");
    inner.style.width = "14px";
    inner.style.height = "14px";
    inner.style.borderRadius = "50%";
    inner.style.background = "#2563eb";
    inner.style.border = "3px solid white";
    inner.style.boxShadow = "0 0 10px rgba(37,99,235,0.45)";

    outer.appendChild(inner);

    userMarkerRef.current = new maplibregl.Marker({ element: outer })
      .setLngLat([userLocation.longitude, userLocation.latitude])
      .setPopup(
        new maplibregl.Popup({ offset: 18 }).setHTML(`
          <div style="font-family:Arial,sans-serif;font-size:14px;">
            <div style="font-weight:700;margin-bottom:6px;">Моё местоположение</div>
            <div>Широта: ${userLocation.latitude.toFixed(6)}</div>
            <div>Долгота: ${userLocation.longitude.toFixed(6)}</div>
            <div style="margin-top:6px;">Радиус поиска: ${radiusKm} км</div>
          </div>
        `)
      )
      .addTo(map);

    const circleData = {
      type: "FeatureCollection",
      features: [
        createCircleGeoJSON(
          userLocation.longitude,
          userLocation.latitude,
          radiusKm
        ),
      ],
    };

    const source = map.getSource("search-radius") as GeoJSONSource | undefined;
    if (source) {
      source.setData(circleData as never);
    }
  }, [userLocation, radiusKm]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    filteredStations.forEach((station) => {
      if (station.latitude == null || station.longitude == null) return;

      const popup = new maplibregl.Popup({ offset: 20 }).setHTML(`
        <div style="min-width:240px;">Загрузка данных...</div>
      `);

      popup.on("open", async () => {
        try {
          const details = await getStationPublicById(station.id);
          popup.setHTML(buildPopupHtml(details));
        } catch {
          popup.setHTML(`
            <div style="min-width:240px;">
              <div style="font-weight:700;margin-bottom:8px;">${
                station.name || "АЗС"
              }</div>
              <div>Не удалось загрузить детали станции</div>
            </div>
          `);
        }
      });

      const el = document.createElement("div");
      el.className = "station-marker";
      el.style.width = "14px";
      el.style.height = "14px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = station.is_operational ? "#dc3545" : "#6c757d";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 0 6px rgba(0,0,0,0.35)";
      el.style.cursor = "pointer";

      el.addEventListener("click", async () => {
        try {
          setSelectedStationLoading(true);
          const details = await getStationPublicById(station.id);
          setSelectedStation(details);
        } catch {
          setSelectedStation(null);
        } finally {
          setSelectedStationLoading(false);
        }
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([station.longitude, station.latitude])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });

    const bounds = new maplibregl.LngLatBounds();

    filteredStations.forEach((station) => {
      if (station.latitude != null && station.longitude != null) {
        bounds.extend([station.longitude, station.latitude]);
      }
    });

    if (userLocation) {
      bounds.extend([userLocation.longitude, userLocation.latitude]);
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: 80,
        maxZoom: 13,
        duration: 700,
      });
    }
  }, [filteredStations, userLocation]);

  const toggleFuelCode = (code: string) => {
    setSelectedFuelCodes((prev) =>
      prev.includes(code) ? prev.filter((x) => x !== code) : [...prev, code]
    );
  };

  const toggleStationGroup = (group: string) => {
    setSelectedStationGroups((prev) =>
      prev.includes(group) ? prev.filter((x) => x !== group) : [...prev, group]
    );
  };

  const resetFilters = () => {
    setSelectedFuelCodes([]);
    setSelectedStationGroups([]);
    setFuelSearch("");
    setStationGroupSearch("");
    setRadiusKm(5);
  };

  return (
    <div
      className="position-relative"
      style={{ width: "100%", height: "100vh" }}
    >
      <div
        className="position-absolute top-0 start-0 m-3 p-3 bg-white rounded shadow z-3"
        style={{ width: 340, maxHeight: "85vh", overflowY: "auto" }}
      >
        <h5 className="mb-3">Поиск АЗС рядом</h5>

        <button className="btn btn-primary w-100 mb-3" onClick={requestUserLocation}>
          Определить мою геолокацию
        </button>

        {geoError && <div className="alert alert-warning py-2">{geoError}</div>}

        {userLocation && (
          <>
            <label className="form-label fw-bold">
              Радиус поиска: {radiusKm} км
            </label>
            <input
              type="range"
              min={1}
              max={30}
              step={1}
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              className="form-range mb-3"
            />
          </>
        )}

        <div className="mb-3">
          <div className="fw-bold mb-2">Фильтр по топливу</div>
          <SearchInput
            value={fuelSearch}
            onChange={setFuelSearch}
            placeholder="Поиск топлива..."
          />

          <div className="d-flex flex-column gap-2 mt-2">
            {filteredFuelCodes.map((code) => (
              <label key={code} className="d-flex align-items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedFuelCodes.includes(code)}
                  onChange={() => toggleFuelCode(code)}
                />
                <span>{FUEL_LABELS[code] || code}</span>
              </label>
            ))}

            {filteredFuelCodes.length === 0 && (
              <div className="text-muted small">Ничего не найдено</div>
            )}
          </div>
        </div>

        <div className="mb-3">
          <div className="fw-bold mb-2">Фильтр по видам/сетям АЗС</div>
          <SearchInput
            value={stationGroupSearch}
            onChange={setStationGroupSearch}
            placeholder="Поиск вида АЗС..."
          />

          <div className="d-flex flex-column gap-2 mt-2">
            {filteredStationGroupsForFilter.map((group) => (
              <label key={group} className="d-flex align-items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedStationGroups.includes(group)}
                  onChange={() => toggleStationGroup(group)}
                />
                <span>{group}</span>
              </label>
            ))}

            {filteredStationGroupsForFilter.length === 0 && (
              <div className="text-muted small">Ничего не найдено</div>
            )}
          </div>
        </div>

        <button className="btn btn-outline-secondary w-100 mb-3" onClick={resetFilters}>
          Сбросить фильтры
        </button>

        <div className="text-muted small">
          Найдено станций: {filteredStations.length}
        </div>
      </div>

      {selectedStation && (
        <div
          className="position-absolute top-0 end-0 m-3 bg-white rounded shadow z-3"
          style={{
            width: 380,
            maxHeight: "88vh",
            overflowY: "auto",
            padding: 20,
          }}
        >
          <div className="d-flex justify-content-between align-items-start mb-3">
            <h5 className="mb-0">{selectedStation.station.name || "АЗС"}</h5>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setSelectedStation(null)}
            >
              ✕
            </button>
          </div>

          <div className="mb-2">
            <strong>Адрес:</strong>{" "}
            {selectedStation.station.full_address_name ||
              selectedStation.station.address_name ||
              "-"}
          </div>

          <div className="mb-2">
            <strong>Работает:</strong>{" "}
            {selectedStation.details.is_operational ? "Да" : "Нет"}
          </div>

          <div className="mb-2">
            <strong>Часы:</strong>{" "}
            {selectedStation.details.working_hours ||
              selectedStation.station.schedule_text_api ||
              "-"}
          </div>

          <div className="mb-3">
            <strong>Колонки:</strong>{" "}
            {selectedStation.details.columns_count ?? "-"}
          </div>

          {selectedStation.details.main_photo_url && (
            <div className="mb-3">
              <img
                src={selectedStation.details.main_photo_url}
                alt="station"
                style={{
                  width: "100%",
                  maxHeight: 180,
                  objectFit: "cover",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                }}
              />
            </div>
          )}

          <div>
            <div className="fw-bold mb-2">Топливо и цены</div>

            {selectedStation.fuels.length === 0 ? (
              <div className="text-muted">Данные по топливу не добавлены</div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {selectedStation.fuels.map((fuel) => (
                  <div
                    key={fuel.fuel_type_id}
                    className="d-flex justify-content-between align-items-center border rounded px-3 py-2"
                  >
                    <span className="fw-semibold">{fuel.name}</span>
                    <span>
                      {fuel.price !== null && fuel.price !== undefined
                        ? `${fuel.price} ₸/л`
                        : "-"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedStationLoading && (
        <div className="position-absolute top-0 end-0 m-3 alert alert-info z-3">
          Загрузка данных станции...
        </div>
      )}

      {loading && (
        <div className="position-absolute top-0 end-0 m-3 alert alert-info z-3">
          Загрузка АЗС...
        </div>
      )}

      {error && (
        <div className="position-absolute top-0 end-0 m-3 alert alert-danger z-3">
          {error}
        </div>
      )}

      <div
        ref={mapContainerRef}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}