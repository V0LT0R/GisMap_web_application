"use client";

import { useEffect, useState } from "react";
import { getCurrentSessionUser } from "@/lib/auth/session";
import type { UserMe } from "@/types/auth";

export default function AdminDashboardPage() {
  const [user, setUser] = useState<UserMe | null>(null);

  useEffect(() => {
    getCurrentSessionUser().then(setUser);
  }, []);

  return (
    <div>
      <h1 className="admin-page-title">Dashboard</h1>

      <div className="admin-grid admin-grid-3">
        <div className="admin-stat">
          <div className="admin-stat-label">Текущий пользователь</div>
          <div className="admin-stat-value admin-stat-accent">
            {user?.email || "-"}
          </div>
        </div>

        <div className="admin-stat">
          <div className="admin-stat-label">Роль</div>
          <div className="admin-stat-value">
            {user?.role || "-"}
          </div>
        </div>

        <div className="admin-stat">
          <div className="admin-stat-label">Статус аккаунта</div>
          <div className="admin-stat-value">
            {user?.is_active ? "Активен" : "Не активен"}
          </div>
        </div>
      </div>

      <div className="admin-grid admin-grid-2 mt-4">
        <div className="admin-card">
          <h2 className="admin-card-title">Профиль</h2>
          <div className="mb-2">
            <strong>Email:</strong> {user?.email || "-"}
          </div>
          <div className="mb-2">
            <strong>Роль:</strong> {user?.role || "-"}
          </div>
          <div className="mb-2">
            <strong>Активен:</strong> {user?.is_active ? "Да" : "Нет"}
          </div>
          <div>
            <strong>Email подтвержден:</strong>{" "}
            {user?.is_email_verified ? "Да" : "Нет"}
          </div>
        </div>

        <div className="admin-card">
          <h2 className="admin-card-title">Что можно делать</h2>
          <ul className="mb-0">
            <li>Просматривать станции</li>
            <li>Редактировать данные по АЗС</li>
            <li>Обновлять виды топлива и цены</li>
            <li>Создавать invite для admin</li>
          </ul>
        </div>
      </div>
    </div>
  );
}