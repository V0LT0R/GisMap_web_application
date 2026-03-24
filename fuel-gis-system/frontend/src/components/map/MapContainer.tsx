"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { fetchFuelStationsAstana, type FuelStationsGeoJSON } from "@/lib/api/stations";

export default function MapContainer() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const loadedRef = useRef(false);

  const [status, setStatus] = useState("Инициализация карты...");

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
        setStatus("Загрузка АЗС из backend...");

        const stationsData: FuelStationsGeoJSON = await fetchFuelStationsAstana();

        map.addSource("fuel-stations", {
          type: "geojson",
          data: stationsData,
        });

        map.addLayer({
          id: "fuel-stations-layer",
          type: "circle",
          source: "fuel-stations",
          paint: {
            "circle-radius": 6,
            "circle-color": "#d32f2f",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        popupRef.current = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12,
          className: "station-popup",
        });

        map.on("mouseenter", "fuel-stations-layer", (e) => {
          map.getCanvas().style.cursor = "pointer";

          const feature = e.features?.[0];
          if (!feature || feature.geometry.type !== "Point") return;

          const coordinates = [...feature.geometry.coordinates] as [number, number];
          const props = feature.properties || {};

          const html = `
            <div style="font-size: 13px; line-height: 1.45; color: black;">
              <div><strong>${props.name || props.org_name || "АЗС"}</strong></div>
              <div>Бренд: ${props.brand || "Не указан"}</div>
              <div>Адрес: ${props.full_address_name || props.address_name || "Не указан"}</div>
              <div>Режим работы: ${props.schedule_text || "Не указан"}</div>
              <div>Рейтинг: ${props.rating ?? "Нет данных"}</div>
            </div>
          `;

          popupRef.current?.setLngLat(coordinates).setHTML(html).addTo(map);
        });

        map.on("mouseleave", "fuel-stations-layer", () => {
          map.getCanvas().style.cursor = "";
          popupRef.current?.remove();
        });

        setStatus(`Загружено АЗС: ${stationsData.features.length}`);
        map.resize();
      } catch (error) {
        console.error("Fuel stations loading error:", error);
        setStatus("Ошибка загрузки АЗС");
      }
    });

    mapInstanceRef.current = map;

    return () => {
      popupRef.current?.remove();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  return (
    <div style={{ padding: "16px", background: "#fff" }}>
      <p style={{ marginBottom: "12px", fontWeight: 700 }}>
        STATUS: {status}
      </p>

      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: "900px",
          border: "2px solid black",
        }}
      />
    </div>
  );
}