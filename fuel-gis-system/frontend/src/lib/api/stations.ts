import { Station } from "@/types/station";

const API_BASE_URL = "http://127.0.0.1:8000";

export async function getStations(): Promise<Station[]> {
  const response = await fetch(`${API_BASE_URL}/api/stations`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Не удалось загрузить список АЗС");
  }

  return response.json();
}