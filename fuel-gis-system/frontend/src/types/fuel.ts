export type FuelStationProperties = {
  osm_id: number;
  osm_type: string;
  name?: string;
  brand?: string;
  operator?: string;
  address?: string;
  opening_hours?: string;
  fuel_diesel?: string;
  fuel_92?: string;
  fuel_95?: string;
  fuel_98?: string;
  fuel_lpg?: string;
};

export type FuelStationFeature = {
  type: "Feature";
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