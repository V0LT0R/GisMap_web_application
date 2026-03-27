export type FuelStationProperties = {
  id?: string | number;
  name?: string;
  full_name?: string;
  address_name?: string;
  full_address_name?: string;
  brand?: string;
  org_name?: string;
  description?: string;
  schedule_text?: string;
  rubrics?: string[];
  fuel_types?: string[];
};

export type FuelStationFeature = {
  type: "Feature";
  id?: string | number;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: FuelStationProperties;
};

export type FuelStationsGeoJSON = {
  type: "FeatureCollection";
  features: FuelStationFeature[];
};

const BACKEND_URL = "http://localhost:8000";

export async function fetchFuelStationsByLocation(
  lat: number,
  lon: number,
  radius = 5000
): Promise<FuelStationsGeoJSON> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    radius: String(radius),
  });

  const response = await fetch(`${BACKEND_URL}/api/stations/2gis?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = `Backend request failed: ${response.status}`;
    try {
      const err = await response.json();
      if (err?.detail) {
        detail = String(err.detail);
      }
    } catch {
      // ignore json parse failure
    }
    throw new Error(detail);
  }

  return response.json();
}