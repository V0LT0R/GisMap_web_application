"use client";

import { useEffect, useRef, useState } from "react";
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
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
}

export default function MapContainer() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const loadedRef = useRef(false);
  const stationsDataRef = useRef<FuelStationsGeoJSON | null>(null);

  const [status, setStatus] = useState("Инициализация карты...");
  const [selectedStation, setSelectedStation] = useState<FuelStationFeature | null>(null);

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

        map.flyTo({
          center: [lon, lat],
          zoom: 13,
          duration: 1200,
          essential: true,
        });

        new maplibregl.Marker({ color: "#16a34a" })
          .setLngLat([lon, lat])
          .addTo(map);

        setStatus("Загрузка АЗС рядом с вами...");

        const stationsData = await fetchFuelStationsByLocation(lat, lon, 30000);
        stationsDataRef.current = stationsData;

        map.addSource("fuel-stations", {
          type: "geojson",
          data: stationsData as GeoJSON.FeatureCollection<GeoJSON.Point>,
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

          const rawData = stationsDataRef.current;
          if (!rawData || clickedId == null) return;

          const originalFeature = rawData.features.find(
            (item) => String(item.properties.id) === String(clickedId)
          );

          if (!originalFeature) {
            console.warn("Станция не найдена в исходных данных:", clickedId);
            return;
          }

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

        setStatus(`Загружено АЗС рядом с вами: ${stationsData.features.length}`);
      } catch (error) {
        console.error("Fuel stations loading error:", error);
        setStatus("Не удалось определить геолокацию или загрузить АЗС");
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  const handleClosePanel = () => {
    setSelectedStation(null);

    const map = mapInstanceRef.current;
    if (!map) return;

    const selectedSource = map.getSource("selected-station") as maplibregl.GeoJSONSource | undefined;
    if (!selectedSource) return;

    selectedSource.setData(emptyFeatureCollection());
  };

  return (
    <div className="map-page">
      <div className="map-toolbar">
        <strong>STATUS:</strong> {status}
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