"use client";

import { useEffect, useState } from "react";
import {
  getStationById,
  updateStationDetails,
  updateStationFuels,
} from "@/lib/api/stations";
import { getToken } from "@/lib/auth/token";
import type { StationFull, StationDetailsUpdate } from "@/types/station";
import type { StationFuelItemUpdate } from "@/types/fuel";
import StationFuelEditor from "@/components/admin/StationFuelEditor";

type Props = {
  stationId: number;
};

export default function StationEditor({ stationId }: Props) {
  const [data, setData] = useState<StationFull | null>(null);
  const [details, setDetails] = useState<StationDetailsUpdate>({
    is_operational: true,
    working_hours: "",
    columns_count: null,
    main_photo_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const token = getToken();
    if (!token) throw new Error("Нет токена");

    const response = await getStationById(token, stationId);
    setData(response);
    setDetails({
      is_operational: response.details.is_operational,
      working_hours: response.details.working_hours ?? "",
      columns_count: response.details.columns_count ?? null,
      main_photo_url: response.details.main_photo_url ?? "",
    });
  };

  useEffect(() => {
    setLoading(true);
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [stationId]);

  const saveDetails = async () => {
    const token = getToken();
    if (!token) return;

    try {
      setSaving(true);
      await updateStationDetails(token, stationId, details);
      await load();
      alert("Детали станции сохранены");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const saveFuels = async (payload: StationFuelItemUpdate[]) => {
    const token = getToken();
    if (!token) return;

    await updateStationFuels(token, stationId, payload);
    await load();
  };

  if (loading) {
    return <div className="alert alert-info">Загрузка станции...</div>;
  }

  if (!data) {
    return <div className="alert alert-warning">Станция не найдена</div>;
  }

  return (
    <div className="card shadow-sm p-3">
      <h4 className="mb-3">{data.station.name || "АЗС"}</h4>

      <div className="mb-2">
        <strong>Адрес:</strong>{" "}
        {data.station.full_address_name || data.station.address_name || "-"}
      </div>

      <div className="mb-2">
        <strong>Бренд:</strong> {data.station.brand || "-"}
      </div>

      <div className="mb-3">
        <strong>Координаты:</strong> {data.station.latitude}, {data.station.longitude}
      </div>

      <div className="row g-3">
        <div className="col-md-3">
          <label className="form-label">Работает</label>
          <select
            className="form-select"
            value={details.is_operational ? "yes" : "no"}
            onChange={(e) =>
              setDetails((prev) => ({
                ...prev,
                is_operational: e.target.value === "yes",
              }))
            }
          >
            <option value="yes">Да</option>
            <option value="no">Нет</option>
          </select>
        </div>

        <div className="col-md-3">
          <label className="form-label">Часы работы</label>
          <input
            className="form-control"
            value={details.working_hours ?? ""}
            onChange={(e) =>
              setDetails((prev) => ({
                ...prev,
                working_hours: e.target.value,
              }))
            }
          />
        </div>

        <div className="col-md-3">
          <label className="form-label">Количество колонок</label>
          <input
            type="number"
            className="form-control"
            value={details.columns_count ?? ""}
            onChange={(e) =>
              setDetails((prev) => ({
                ...prev,
                columns_count: e.target.value ? Number(e.target.value) : null,
              }))
            }
          />
        </div>

        <div className="col-md-3">
          <label className="form-label">Ссылка на фото</label>
          <input
            className="form-control"
            value={details.main_photo_url ?? ""}
            onChange={(e) =>
              setDetails((prev) => ({
                ...prev,
                main_photo_url: e.target.value,
              }))
            }
          />
        </div>
      </div>

      <button
        className="btn btn-primary mt-3"
        onClick={saveDetails}
        disabled={saving}
      >
        {saving ? "Сохранение..." : "Сохранить детали"}
      </button>

      <StationFuelEditor initialFuels={data.fuels} onSave={saveFuels} />
    </div>
  );
}