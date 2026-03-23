"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export default function MapContainer() {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const [status, setStatus] = useState("Инициализация карты...");

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    try {
      const map = new maplibregl.Map({
        container: mapRef.current,
        center: [65.4823, 44.8488],
        zoom: 10,
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

      map.on("load", () => {
        setStatus("Карта загружена");
        map.resize();
      });

      map.on("error", (e) => {
        console.error("Map error:", e);
        setStatus("Ошибка загрузки карты");
      });

      mapInstanceRef.current = map;

      return () => {
        map.remove();
        mapInstanceRef.current = null;
      };
    } catch (error) {
      console.error("Map init error:", error);
      setStatus("Ошибка инициализации карты");
    }
  }, []);

  return (
    <div style={{ padding: "16px", background: "#fff" }}>
      <p style={{ marginBottom: "12px", fontWeight: 700 }}>
        STATUS: {status}
      </p>

      <div
        ref={mapRef}
        className="h-full w-full"
        style={{
          width: "100%",
          height: "600px",
          
          border: "2px solid black",
        }}
      />
    </div>
  );
}