"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Station } from "@/types/station";

interface MapContainerProps {
  stations: Station[];
}

export default function MapContainer({ stations }: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [65.4823, 44.8488],
      zoom: 11,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      console.log("Map loaded");
    });

    mapInstanceRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    stations.forEach((station) => {
      const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
        <div style="min-width: 200px;">
          <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 700;">
            ${station.name}
          </h3>
          <p style="margin: 0 0 4px;"><strong>Бренд:</strong> ${station.brand}</p>
          <p style="margin: 0;"><strong>Адрес:</strong> ${station.address}</p>
        </div>
      `);

      const marker = new maplibregl.Marker()
        .setLngLat([station.longitude, station.latitude])
        .setPopup(popup)
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [stations]);

  return <div ref={mapRef} className="h-[600px] w-full rounded-2xl" />;
}