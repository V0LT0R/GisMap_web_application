export type AdminAssignedStation = {
  id: number;
  name?: string | null;
  address_name?: string | null;
  full_address_name?: string | null;
};

export type AdminUser = {
  id: number;
  email: string;
  role: "super_admin" | "admin" | "user";
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
  assigned_station_ids: number[];
  assigned_stations: AdminAssignedStation[];
};
