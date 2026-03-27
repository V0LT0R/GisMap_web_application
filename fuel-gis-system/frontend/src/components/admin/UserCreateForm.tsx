"use client";

import { useState } from "react";
import { createAdminInvite } from "@/lib/api/admin";
import { getToken } from "@/lib/auth/token";

export default function UserCreateForm() {
  const [assignedEmail, setAssignedEmail] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(48);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult("");
    setError("");

    try {
      const token = getToken();
      if (!token) {
        throw new Error("Нет токена авторизации");
      }

      const data = await createAdminInvite(token, {
        assigned_email: assignedEmail || undefined,
        expires_in_hours: expiresInHours,
      });

      setResult(`Invite code: ${data.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания invite");
    }
  };

  return (
    <form onSubmit={handleCreate} className="admin-card">
      <h2 className="admin-card-title">Создать invite для admin</h2>

      {result && <div className="alert alert-success">{result}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="mb-3">
        <label className="form-label">Email admin</label>
        <input
          type="email"
          className="form-control"
          value={assignedEmail}
          onChange={(e) => setAssignedEmail(e.target.value)}
          placeholder="owner@example.com"
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Срок действия invite, часы</label>
        <input
          type="number"
          className="form-control"
          value={expiresInHours}
          min={1}
          max={168}
          onChange={(e) => setExpiresInHours(Number(e.target.value))}
        />
      </div>

      <button type="submit" className="btn btn-primary">
        Создать invite
      </button>
    </form>
  );
}