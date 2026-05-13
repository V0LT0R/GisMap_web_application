"use client";

import { useEffect, useMemo, useState } from "react";
import { getAuditLogs } from "@/lib/api/admin";
import { getToken } from "@/lib/auth/token";
import type { AuditLogItem } from "@/types/audit";

const ACTION_LABELS: Record<string, string> = {
  station_details_update: "Изменение деталей АЗС",
  station_fuels_update: "Изменение топлива/цен",
  admin_station_assign: "Назначение АЗС",
  admin_station_replace: "Обновление назначений",
  admin_user_create: "Создание admin",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function actionLabel(action: string) {
  return ACTION_LABELS[action] || action;
}

export default function AuditTable() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);

  const actions = useMemo(() => Array.from(new Set(logs.map((item) => item.action))), [logs]);

  const loadLogs = async (query = search) => {
    const token = getToken();
    if (!token) {
      setError("Не найден токен авторизации");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");
      const response = await getAuditLogs(token, { search: query, limit: 150 });
      setLogs(response.items);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить аудит");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="admin-card audit-card">
      <div className="audit-header">
        <div>
          <h2 className="admin-card-title mb-1">Журнал действий</h2>
          <div className="admin-muted">
            Здесь super admin видит изменения деталей АЗС, цен, топлива, пользователей и назначений.
          </div>
        </div>
        <div className="audit-total">Всего записей: {total}</div>
      </div>

      <div className="audit-controls">
        <input
          className="form-control"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Поиск по email, действию, объекту или описанию"
        />
        <button className="btn btn-primary" onClick={() => loadLogs(search)} disabled={loading}>
          Найти
        </button>
        <button
          className="btn btn-outline-secondary"
          onClick={() => {
            setSearch("");
            loadLogs("");
          }}
          disabled={loading}
        >
          Сбросить
        </button>
      </div>

      {actions.length > 0 && (
        <div className="audit-action-chips">
          {actions.map((action) => (
            <span key={action}>{actionLabel(action)}</span>
          ))}
        </div>
      )}

      {error && <div className="alert alert-danger mt-3">{error}</div>}
      {loading && <div className="alert alert-info mt-3">Загрузка журнала...</div>}

      {!loading && logs.length === 0 && !error && (
        <div className="admin-muted mt-3">Пока нет записей аудита. Записи появятся после изменений в админке.</div>
      )}

      {logs.length > 0 && (
        <div className="table-responsive mt-3">
          <table className="table audit-table align-middle">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Пользователь</th>
                <th>Действие</th>
                <th>Объект</th>
                <th>Описание</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="audit-date">{formatDate(log.created_at)}</td>
                  <td>
                    <strong>{log.user_email || "system"}</strong>
                    <small>{log.user_role || "-"}</small>
                  </td>
                  <td>
                    <span className="audit-badge">{actionLabel(log.action)}</span>
                  </td>
                  <td>
                    <strong>{log.entity_type || "-"}</strong>
                    <small>#{log.entity_id || "-"}</small>
                  </td>
                  <td>{log.description || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
