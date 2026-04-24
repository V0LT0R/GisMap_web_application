import type {
  StationDetailsUpdate,
  StationFull,
  StationListItem,
} from "@/types/station";
import type { FuelType, StationFuelItemUpdate } from "@/types/fuel";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function getStations(search?: string): Promise<StationListItem[]> {
  const url = new URL(`${API_URL}/api/stations`);
  if (search) {
    url.searchParams.set("search", search);
  }

  const res = await fetch(url.toString(), {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Не удалось загрузить станции");
  }

  return res.json();
}

export async function getMyStations(
  token: string,
  search?: string
): Promise<StationListItem[]> {
  const url = new URL(`${API_URL}/api/stations/my`);
  if (search) {
    url.searchParams.set("search", search);
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.detail || "Не удалось загрузить мои станции");
  }

  return res.json();
}

export async function getStationById(
  token: string,
  stationId: number
): Promise<StationFull> {
  const res = await fetch(`${API_URL}/api/stations/${stationId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.detail || "Не удалось загрузить станцию");
  }

  return res.json();
}

export async function getStationPublicById(
  stationId: number
): Promise<StationFull> {
  const res = await fetch(`${API_URL}/api/stations/${stationId}/public`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.detail || "Не удалось загрузить публичную карточку АЗС");
  }

  return res.json();
}

export async function getFuelTypes(): Promise<FuelType[]> {
  const res = await fetch(`${API_URL}/api/stations/fuel-types`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Не удалось загрузить типы топлива");
  }

  return res.json();
}

export async function updateStationDetails(
  token: string,
  stationId: number,
  payload: StationDetailsUpdate
) {
  const res = await fetch(`${API_URL}/api/admin/stations/${stationId}/details`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.detail || "Не удалось обновить детали АЗС");
  }

  return res.json();
}

export async function updateStationFuels(
  token: string,
  stationId: number,
  payload: StationFuelItemUpdate[]
) {
  const res = await fetch(`${API_URL}/api/admin/stations/${stationId}/fuels`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.detail || "Не удалось обновить топливо");
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