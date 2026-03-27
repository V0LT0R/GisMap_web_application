"use client";

import { useEffect, useState } from "react";
import { getCurrentSessionUser } from "@/lib/auth/session";
import type { UserMe } from "@/types/auth";

export default function ProfilePage() {
  const [user, setUser] = useState<UserMe | null>(null);

  useEffect(() => {
    getCurrentSessionUser().then(setUser);
  }, []);

  return (
    <div className="container py-4">
      <div className="admin-card" style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 className="admin-card-title">Профиль</h1>

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
    </div>
  );
}