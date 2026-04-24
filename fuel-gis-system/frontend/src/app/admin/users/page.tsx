"use client";

import { useEffect, useState } from "react";
import UserCreateForm from "@/components/admin/UserCreateForm";
import UserAssignStations from "@/components/admin/UserAssignStations";
import { getAdminUsers, getAllStationsForAdmin } from "@/lib/api/admin";
import { getToken } from "@/lib/auth/token";
import type { AdminUser } from "@/types/user";
import type { StationListItem } from "@/types/station";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stations, setStations] = useState<StationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    const token = getToken();
    if (!token) {
      setError("Нет токена авторизации");
      return;
    }

    const [usersData, stationsData] = await Promise.all([
      getAdminUsers(token),
      getAllStationsForAdmin(token),
    ]);

    setUsers(usersData);
    setStations(stationsData);
  };

  useEffect(() => {
    setLoading(true);
    loadData()
      .catch((err) => setError(err instanceof Error ? err.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="admin-page-title">Пользователи</h1>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="alert alert-info">Загрузка...</div>}

      <div className="admin-grid admin-grid-2">
        <UserCreateForm onCreated={loadData} />
        <UserAssignStations admins={users} stations={stations} onSaved={loadData} />
      </div>

      <div className="admin-card mt-4">
        <h2 className="admin-card-title">Список admin пользователей</h2>

        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Email</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Email подтвержден</th>
                <th>АЗС</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.is_active ? "Активен" : "Не активен"}</td>
                  <td>{user.is_email_verified ? "Да" : "Нет"}</td>
                  <td>
                    {user.role === "super_admin"
                      ? "Все АЗС"
                      : user.assigned_stations.length > 0
                      ? user.assigned_stations.map((station) => station.name || `АЗС #${station.id}`).join(", ")
                      : "Не назначены"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
