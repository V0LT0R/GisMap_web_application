"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { type MapLayerMouseEvent } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import {
  fetchFuelStationsByLocation,
  type FuelStationFeature,
  type FuelStationsGeoJSON,
} from "@/lib/api/stations";

function emptyFeatureCollection(): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: [],
  };
}

function getUserLocation(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Геолокация не поддерживается браузером"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

function radiusLabel(radiusMeters: number): string {
  if (radiusMeters < 1000) {
    return `${radiusMeters} м`;
  }
  return `${radiusMeters / 1000} км`;
}

export default function MapContainer() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const loadedRef = useRef(false);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const userLocationRef = useRef<{ lat: number; lon: number } | null>(null);
  const allStationsRef = useRef<FuelStationsGeoJSON | null>(null);
  const requestIdRef = useRef(0);

  const [status, setStatus] = useState("Инициализация карты...");
  const [selectedStation, setSelectedStation] = useState<FuelStationFeature | null>(null);

  const [radius, setRadius] = useState(5000);
  const [debouncedRadius, setDebouncedRadius] = useState(5000);

  const [selectedFuel, setSelectedFuel] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");

  const [allStations, setAllStations] = useState<FuelStationFeature[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedRadius(radius);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [radius]);

  const brandOptions = useMemo(() => {
    const brands = allStations
      .map((item) => item.properties.brand || item.properties.org_name || "Без бренда")
      .filter(Boolean);

    return ["all", ...Array.from(new Set(brands)).sort((a, b) => a.localeCompare(b, "ru"))];
  }, [allStations]);

  const fuelOptions = useMemo(() => {
    const fuels = allStations.flatMap((item) =>
      Array.isArray(item.properties.fuel_types) ? item.properties.fuel_types : []
    );

    return ["all", ...Array.from(new Set(fuels)).sort((a, b) => a.localeCompare(b, "ru"))];
  }, [allStations]);

  useEffect(() => {
    if (selectedBrand !== "all" && !brandOptions.includes(selectedBrand)) {
      setSelectedBrand("all");
    }
  }, [brandOptions, selectedBrand]);

  useEffect(() => {
    if (selectedFuel !== "all" && !fuelOptions.includes(selectedFuel)) {
      setSelectedFuel("all");
    }
  }, [fuelOptions, selectedFuel]);

  const filteredStations = useMemo(() => {
    return allStations.filter((station) => {
      const brand = station.properties.brand || station.properties.org_name || "Без бренда";
      const fuelTypes = Array.isArray(station.properties.fuel_types)
        ? station.properties.fuel_types
        : [];

      const brandOk = selectedBrand === "all" || brand === selectedBrand;
      const fuelOk =
        selectedFuel === "all" ||
        fuelTypes.some((fuel) => fuel.toLowerCase() === selectedFuel.toLowerCase());

      return brandOk && fuelOk;
    });
  }, [allStations, selectedFuel, selectedBrand]);

  async function loadStationsByUserLocation(newRadius: number) {
    const map = mapInstanceRef.current;
    const userLocation = userLocationRef.current;

    if (!map || !userLocation) return;

    const currentRequestId = ++requestIdRef.current;
    setStatus(`Загрузка АЗС в радиусе ${radiusLabel(newRadius)}...`);

    try {
      const stationsData = await fetchFuelStationsByLocation(
        userLocation.lat,
        userLocation.lon,
        newRadius
      );

      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      allStationsRef.current = stationsData;
      setAllStations(stationsData.features);
      setSelectedStation(null);

      const fuelSource = map.getSource("fuel-stations") as maplibregl.GeoJSONSource | undefined;
      if (fuelSource) {
        fuelSource.setData({
          type: "FeatureCollection",
          features: stationsData.features.map((item) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: item.geometry.coordinates,
            },
            properties: {
              id: item.properties.id,
              name: item.properties.name,
              brand: item.properties.brand,
            },
          })),
        });
      }

      const selectedSource = map.getSource("selected-station") as maplibregl.GeoJSONSource | undefined;
      if (selectedSource) {
        selectedSource.setData(emptyFeatureCollection());
      }

      setStatus(`Загружено АЗС: ${stationsData.features.length}. Радиус: ${radiusLabel(newRadius)}`);
    } catch (error) {
      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      console.error(error);
      setStatus(error instanceof Error ? error.message : "Ошибка загрузки АЗС");
    }
  }

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      center: [71.4304, 51.1282],
      zoom: 11,
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
            id: "osm-tiles",
            type: "raster",
            source: "osm",
          },
        ],
      },
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", async () => {
      if (loadedRef.current) return;
      loadedRef.current = true;

      try {
        setStatus("Определение геолокации...");

        const { lat, lon } = await getUserLocation();
        userLocationRef.current = { lat, lon };

        map.flyTo({
          center: [lon, lat],
          zoom: 13,
          duration: 1200,
          essential: true,
        });

        userMarkerRef.current = new maplibregl.Marker({ color: "#16a34a" })
          .setLngLat([lon, lat])
          .addTo(map);

        map.addSource("fuel-stations", {
          type: "geojson",
          data: emptyFeatureCollection(),
        });

        map.addSource("selected-station", {
          type: "geojson",
          data: emptyFeatureCollection(),
        });

        map.addLayer({
          id: "fuel-stations-layer",
          type: "circle",
          source: "fuel-stations",
          paint: {
            "circle-radius": 6,
            "circle-color": "#dc2626",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        map.addLayer({
          id: "selected-station-layer",
          type: "circle",
          source: "selected-station",
          paint: {
            "circle-radius": 11,
            "circle-color": "#2563eb",
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff",
          },
        });

        map.on("mouseenter", "fuel-stations-layer", () => {
          map.getCanvas().style.cursor = "pointer";
        });

        map.on("mouseleave", "fuel-stations-layer", () => {
          map.getCanvas().style.cursor = "";
        });

        map.on("click", "fuel-stations-layer", (e: MapLayerMouseEvent) => {
          const clicked = e.features?.[0];
          if (!clicked) return;

          const clickedProps = clicked.properties as Record<string, unknown> | undefined;
          const clickedId = clickedProps?.id;

          const rawData = allStationsRef.current;
          if (!rawData || clickedId == null) return;

          const originalFeature = rawData.features.find(
            (item) => String(item.properties.id) === String(clickedId)
          );

          if (!originalFeature) return;

          setSelectedStation(originalFeature);

          const selectedSource = map.getSource("selected-station") as maplibregl.GeoJSONSource;
          selectedSource.setData({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                geometry: {
                  type: "Point",
                  coordinates: originalFeature.geometry.coordinates,
                },
                properties: {
                  id: originalFeature.properties.id,
                },
              },
            ],
          });

          map.flyTo({
            center: originalFeature.geometry.coordinates,
            zoom: 14.5,
            duration: 1200,
            essential: true,
          });
        });

        await loadStationsByUserLocation(debouncedRadius);
      } catch (error) {
        console.error("Fuel stations loading error:", error);
        setStatus("Не удалось определить геолокацию или загрузить АЗС");
      }
    });

    mapInstanceRef.current = map;

    return () => {
      userMarkerRef.current?.remove();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const source = map.getSource("fuel-stations") as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    source.setData({
      type: "FeatureCollection",
      features: filteredStations.map((item) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: item.geometry.coordinates,
        },
        properties: {
          id: item.properties.id,
          name: item.properties.name,
          brand: item.properties.brand,
        },
      })),
    });

    if (selectedStation) {
      const stillExists = filteredStations.some(
        (item) => String(item.properties.id) === String(selectedStation.properties.id)
      );

      if (!stillExists) {
        setSelectedStation(null);
        const selectedSource = map.getSource("selected-station") as maplibregl.GeoJSONSource | undefined;
        selectedSource?.setData(emptyFeatureCollection());
      }
    }
  }, [filteredStations, selectedStation]);

  useEffect(() => {
    const userLocation = userLocationRef.current;
    if (!userLocation) return;

    loadStationsByUserLocation(debouncedRadius);
  }, [debouncedRadius]);

  const handleClosePanel = () => {
    setSelectedStation(null);

    const map = mapInstanceRef.current;
    if (!map) return;

    const selectedSource = map.getSource("selected-station") as maplibregl.GeoJSONSource | undefined;
    selectedSource?.setData(emptyFeatureCollection());
  };

  return (
    <div className="map-page">
      <div className="map-toolbar">
        <strong>STATUS:</strong> {status}
      </div>

      <div className="map-filters">
        <div className="filter-group filter-group-radius">
          <label htmlFor="radiusRange" className="filter-label">
            Радиус поиска: <strong>{radiusLabel(radius)}</strong>
          </label>
          <input
            id="radiusRange"
            type="range"
            min={1000}
            max={15000}
            step={1000}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="filter-range"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="fuelFilter" className="filter-label">
            Тип топлива
          </label>
          <select
            id="fuelFilter"
            value={selectedFuel}
            onChange={(e) => setSelectedFuel(e.target.value)}
            className="filter-select"
          >
            {fuelOptions.map((fuel) => (
              <option key={fuel} value={fuel}>
                {fuel === "all" ? "Все виды топлива" : fuel}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="brandFilter" className="filter-label">
            Вид заправки / бренд
          </label>
          <select
            id="brandFilter"
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="filter-select"
          >
            {brandOptions.map((brand) => (
              <option key={brand} value={brand}>
                {brand === "all" ? "Все заправки" : brand}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="map-layout">
        <div ref={mapRef} className="map-canvas" />

        <aside className="station-sidebar">
          {selectedStation ? (
            <div className="station-card">
              <div className="station-card-header">
                <div>
                  <h2 className="station-title">
                    {selectedStation.properties.name ||
                      selectedStation.properties.org_name ||
                      "АЗС"}
                  </h2>
                  <p className="station-subtitle">
                    {selectedStation.properties.brand || "Бренд не указан"}
                  </p>
                </div>

                <button
                  className="station-close-btn"
                  onClick={handleClosePanel}
                  type="button"
                >
                  ✕
                </button>
              </div>

              <div className="station-section">
                <h3>Основная информация</h3>
                <p>
                  <strong>Полное название:</strong>{" "}
                  {selectedStation.properties.full_name || "Нет данных"}
                </p>
                <p>
                  <strong>Адрес:</strong>{" "}
                  {selectedStation.properties.full_address_name ||
                    selectedStation.properties.address_name ||
                    "Нет данных"}
                </p>
                <p>
                  <strong>Бренд:</strong>{" "}
                  {selectedStation.properties.brand || "Нет данных"}
                </p>
                <p>
                  <strong>Режим работы:</strong>{" "}
                  {selectedStation.properties.schedule_text || "Нет данных"}
                </p>
              </div>

              <div className="station-section">
                <h3>Типы топлива</h3>
                {Array.isArray(selectedStation.properties.fuel_types) &&
                selectedStation.properties.fuel_types.length > 0 ? (
                  <div className="fuel-tags">
                    {selectedStation.properties.fuel_types.map((fuel) => (
                      <span key={fuel} className="fuel-tag">
                        {fuel}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p>Нет данных</p>
                )}
              </div>

              <div className="station-section">
                <h3>Категории</h3>
                {Array.isArray(selectedStation.properties.rubrics) &&
                selectedStation.properties.rubrics.length > 0 ? (
                  <ul className="station-list">
                    {selectedStation.properties.rubrics.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Нет данных</p>
                )}
              </div>

              <div className="station-section">
                <h3>Описание</h3>
                <p>{selectedStation.properties.description || "Нет данных"}</p>
              </div>

              <div className="station-section">
                <h3>Координаты</h3>
                <p>
                  <strong>Долгота:</strong> {selectedStation.geometry.coordinates[0]}
                </p>
                <p>
                  <strong>Широта:</strong> {selectedStation.geometry.coordinates[1]}
                </p>
              </div>
            </div>
          ) : (
            <div className="station-card station-card-empty">
              <h2>Информация об АЗС</h2>
              <p>Нажми на заправку на карте, чтобы открыть подробную карточку.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}