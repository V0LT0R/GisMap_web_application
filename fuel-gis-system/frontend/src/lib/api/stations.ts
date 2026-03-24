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
  reviews_count?: number;
  rating?: number;
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

export async function fetchFuelStationsAstana(): Promise<FuelStationsGeoJSON> {
  const response = await fetch(`${BACKEND_URL}/api/stations/2gis`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }

  return response.json();
}