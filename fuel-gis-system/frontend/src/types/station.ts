export type StationListItem = {
  id: number;
  name?: string | null;
  full_name?: string | null;
  address_name?: string | null;
  full_address_name?: string | null;
  brand?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_operational: boolean;
  working_hours?: string | null;
  columns_count?: number | null;
  main_photo_url?: string | null;
  fuel_codes: string[];
};

export type StationBase = {
  id: number;
  external_id: string;
  source: string;
  name?: string | null;
  full_name?: string | null;
  address_name?: string | null;
  full_address_name?: string | null;
  brand?: string | null;
  org_name?: string | null;
  description?: string | null;
  schedule_text_api?: string | null;
  rubrics_json?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  updated_at: string;
};

export type StationDetails = {
  is_operational: boolean;
  working_hours?: string | null;
  columns_count?: number | null;
  main_photo_url?: string | null;
};

export type StationFuel = {
  fuel_type_id: number;
  code: string;
  name: string;
  is_available: boolean;
  price?: number | null;
};

export type StationFull = {
  station: StationBase;
  details: StationDetails;
  fuels: StationFuel[];
};

export type StationDetailsUpdate = {
  is_operational: boolean;
  working_hours?: string | null;
  columns_count?: number | null;
  main_photo_url?: string | null;
};