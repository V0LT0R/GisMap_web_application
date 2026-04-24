"use client";

import { useMemo, useState } from "react";
import type { AdminUser } from "@/types/user";
import type { StationListItem } from "@/types/station";
import { getToken } from "@/lib/auth/token";
import { replaceAdminStations } from "@/lib/api/admin";
import SearchInput from "@/components/common/SearchInput";

export default function UserAssignStations({
  admins,
  stations,
  onSaved,
}: {
  admins: AdminUser[];
  stations: StationListItem[];
  onSaved: () => Promise<void> | void;
}) {
  const assignableAdmins = admins.filter((user) => user.role === "admin");
  const [selectedAdminId, setSelectedAdminId] = useState<number | null>(
    assignableAdmins[0]?.id ?? null
  );
  const [selectedStationIds, setSelectedStationIds] = useState<number[]>(
    assignableAdmins[0]?.assigned_station_ids ?? []
  );
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedAdmin = useMemo(
    () => assignableAdmins.find((user) => user.id === selectedAdminId) ?? null,
    [assignableAdmins, selectedAdminId]
  );

  const filteredStations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return stations;

    return stations.filter((station) => {
      const text = [station.name, station.brand, station.address_name, station.full_address_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(query);
    });
  }, [search, stations]);

  const handleAdminChange = (adminId: number) => {
    setSelectedAdminId(adminId);
    const admin = assignableAdmins.find((item) => item.id === adminId);
    setSelectedStationIds(admin?.assigned_station_ids ?? []);
    setMessage("");
    setError("");
  };

  const toggleStation = (stationId: number) => {
    setSelectedStationIds((prev) =>
      prev.includes(stationId)
        ? prev.filter((id) => id !== stationId)
        : [...prev, stationId]
    );
  };

  const handleSave = async () => {
    if (!selectedAdminId) return;

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const token = getToken();
      if (!token) throw new Error("Нет токена авторизации");
      const data = await replaceAdminStations(token, selectedAdminId, selectedStationIds);
      setMessage(data.message);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения назначений");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-card">
      <h2 className="admin-card-title">Назначение АЗС admin</h2>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {assignableAdmins.length === 0 ? (
        <div className="text-muted">Сначала создайте admin аккаунт</div>
      ) : (
        <>
          <div className="mb-3">
            <label className="form-label">Выберите admin</label>
            <select
              className="form-select"
              value={selectedAdminId ?? ""}
              onChange={(e) => handleAdminChange(Number(e.target.value))}
            >
              {assignableAdmins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.email}
                </option>
              ))}
            </select>
          </div>

          {selectedAdmin && (
            <div className="mb-3 small text-muted">
              Уже назначено АЗС: {selectedAdmin.assigned_station_ids.length}
            </div>
          )}

          <div className="mb-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Поиск АЗС по названию, адресу, бренду"
            />
          </div>

          <div className="border rounded p-2" style={{ maxHeight: 430, overflowY: "auto" }}>
            <div className="d-flex flex-column gap-2">
              {filteredStations.map((station) => (
                <label key={station.id} className="border rounded px-3 py-2 d-flex gap-2 align-items-start">
                  <input
                    type="checkbox"
                    checked={selectedStationIds.includes(station.id)}
                    onChange={() => toggleStation(station.id)}
                    style={{ marginTop: 4 }}
                  />
                  <span>
                    <span className="fw-semibold d-block">{station.name || "АЗС"}</span>
                    <span className="small text-muted d-block">
                      {station.full_address_name || station.address_name || "Адрес не указан"}
                    </span>
                  </span>
                </label>
              ))}

              {filteredStations.length === 0 && (
                <div className="text-muted">Станции не найдены</div>
              )}
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <div className="small text-muted">Выбрано: {selectedStationIds.length}</div>
            <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? "Сохранение..." : "Сохранить назначения"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
