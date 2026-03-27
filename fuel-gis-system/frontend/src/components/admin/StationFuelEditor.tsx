"use client";

import { useEffect, useMemo, useState } from "react";
import { getFuelTypes } from "@/lib/api/stations";
import type { FuelType, StationFuelItemUpdate } from "@/types/fuel";
import type { StationFuel } from "@/types/station";

type Props = {
  initialFuels: StationFuel[];
  onSave: (payload: StationFuelItemUpdate[]) => Promise<void>;
};

export default function StationFuelEditor({ initialFuels, onSave }: Props) {
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [rows, setRows] = useState<StationFuelItemUpdate[]>([]);
  const [loading, setLoading] = useState(false);

  const initialMap = useMemo(() => {
    const map = new Map<number, StationFuel>();
    initialFuels.forEach((fuel) => map.set(fuel.fuel_type_id, fuel));
    return map;
  }, [initialFuels]);

  useEffect(() => {
    const load = async () => {
      const types = await getFuelTypes();
      setFuelTypes(types);

      const prepared = types.map((type) => {
        const existing = initialMap.get(type.id);
        return {
          fuel_type_id: type.id,
          is_available: existing?.is_available ?? false,
          price: existing?.price ?? null,
        };
      });

      setRows(prepared);
    };

    load().catch(console.error);
  }, [initialMap]);

  const updateRow = (
    fuelTypeId: number,
    patch: Partial<StationFuelItemUpdate>
  ) => {
    setRows((prev) =>
      prev.map((row) =>
        row.fuel_type_id === fuelTypeId ? { ...row, ...patch } : row
      )
    );
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await onSave(rows);
      alert("Топливо обновлено");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка сохранения топлива");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card shadow-sm p-3 mt-3">
      <h5 className="mb-3">Топливо и цены</h5>

      <div className="table-responsive">
        <table className="table table-bordered align-middle">
          <thead>
            <tr>
              <th>Тип топлива</th>
              <th>Есть</th>
              <th>Цена</th>
            </tr>
          </thead>
          <tbody>
            {fuelTypes.map((type) => {
              const row = rows.find((r) => r.fuel_type_id === type.id);

              return (
                <tr key={type.id}>
                  <td>{type.name}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={row?.is_available ?? false}
                      onChange={(e) =>
                        updateRow(type.id, {
                          is_available: e.target.checked,
                          price: e.target.checked ? row?.price ?? null : null,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="form-control"
                      disabled={!row?.is_available}
                      value={row?.price ?? ""}
                      onChange={(e) =>
                        updateRow(type.id, {
                          price: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button className="btn btn-success" onClick={handleSave} disabled={loading}>
        {loading ? "Сохранение..." : "Сохранить топливо"}
      </button>
    </div>
  );
}