export type FuelType = {
  id: number;
  code: string;
  name: string;
  sort_order: number;
};

export type StationFuelItemUpdate = {
  fuel_type_id: number;
  is_available: boolean;
  price?: number | null;
};