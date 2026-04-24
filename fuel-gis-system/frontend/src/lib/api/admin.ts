import type { AdminUser } from "@/types/user";
import type { StationListItem } from "@/types/station";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function createAdminInvite(
  token: string,
  payload: { assigned_email?: string; expires_in_hours?: number }
) {
  const res = await fetch(`${API_URL}/api/auth/admin/invite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.detail || "Не удалось создать invite");
  }

  return res.json();
}

export async function getAdminUsers(token: string): Promise<AdminUser[]> {
  const res = await fetch(`${API_URL}/api/admin/users`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.detail || "Не удалось загрузить пользователей");
  }

  return res.json();
}

export async function createAdminUser(
  token: string,
  payload: { email: string; password: string; is_active?: boolean; is_email_verified?: boolean }
): Promise<AdminUser> {
  const res = await fetch(`${API_URL}/api/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.detail || "Не удалось создать admin");
  }

  return res.json();
}

export async function replaceAdminStations(
  token: string,
  adminUserId: number,
  stationIds: number[]
) {
  const res = await fetch(`${API_URL}/api/admin/users/${adminUserId}/stations`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ station_ids: stationIds }),
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.detail || "Не удалось сохранить назначение станций");
  }

  return res.json();
}

export async function getAllStationsForAdmin(token: string): Promise<StationListItem[]> {
  const res = await fetch(`${API_URL}/api/stations`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.detail || "Не удалось загрузить станции");
  }

  return res.json();
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
