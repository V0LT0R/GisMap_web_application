const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

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

export async function assignStationsToAdmin(
  token: string,
  payload: { admin_user_id: number; station_ids: number[] }
) {
  const res = await fetch(`${API_URL}/api/admin/stations/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.detail || "Не удалось назначить станции");
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