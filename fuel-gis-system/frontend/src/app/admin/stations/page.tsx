"use client";

import { useEffect, useState } from "react";
import SearchInput from "@/components/common/SearchInput";
import StationEditor from "@/components/admin/StationEditor";
import { getMyStations } from "@/lib/api/stations";
import { getToken } from "@/lib/auth/token";
import type { StationListItem } from "@/types/station";

export default function AdminStationsPage() {
  const [stations, setStations] = useState<StationListItem[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadStations = async (searchValue?: string) => {
    const token = getToken();
    if (!token) return;

    const data = await getMyStations(token, searchValue);
    setStations(data);

    if (data.length > 0) {
      setSelectedStationId((prev) => prev ?? data[0].id);
    } else {
      setSelectedStationId(null);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadStations()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSearch = async (value: string) => {
    setSearch(value);
    await loadStations(value);
  };

  return (
    <div className="row g-4">
      <div className="col-lg-4">
        <div className="card shadow-sm p-3">
          <h3 className="mb-3">Мои АЗС</h3>

          <SearchInput
            value={search}
            onChange={handleSearch}
            placeholder="Поиск по названию, адресу, бренду"
          />

          {loading ? (
            <div className="mt-3 alert alert-info">Загрузка...</div>
          ) : (
            <div className="list-group mt-3">
              {stations.map((station) => (
                <button
                  key={station.id}
                  type="button"
                  className={`list-group-item list-group-item-action ${
                    selectedStationId === station.id ? "active" : ""
                  }`}
                  onClick={() => setSelectedStationId(station.id)}
                >
                  <div className="fw-bold">{station.name || "АЗС"}</div>
                  <div className="small">
                    {station.full_address_name || station.address_name || "-"}
                  </div>
                </button>
              ))}

              {stations.length === 0 && (
                <div className="text-muted mt-3">Станции не найдены</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="col-lg-8">
        {selectedStationId ? (
          <StationEditor stationId={selectedStationId} />
        ) : (
          <div className="card shadow-sm p-4">
            Выбери станцию слева
          </div>
        )}
      </div>
    </div>
  );
}