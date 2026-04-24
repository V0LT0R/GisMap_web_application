"use client";

import { useState } from "react";
import { createAdminInvite, createAdminUser } from "@/lib/api/admin";
import { getToken } from "@/lib/auth/token";

export default function UserCreateForm({ onCreated }: { onCreated: () => Promise<void> | void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [assignedEmail, setAssignedEmail] = useState("");
  const [expiresInHours, setExpiresInHours] = useState(48);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult("");
    setError("");
    setLoading(true);

    try {
      const token = getToken();
      if (!token) throw new Error("Нет токена авторизации");

      const data = await createAdminUser(token, {
        email,
        password,
        is_active: true,
        is_email_verified: true,
      });

      setResult(`Admin создан: ${data.email}`);
      setEmail("");
      setPassword("");
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания admin");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult("");
    setError("");
    setLoading(true);

    try {
      const token = getToken();
      if (!token) throw new Error("Нет токена авторизации");

      const data = await createAdminInvite(token, {
        assigned_email: assignedEmail || undefined,
        expires_in_hours: expiresInHours,
      });

      setResult(`Invite code: ${data.code}`);
      setAssignedEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания invite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex flex-column gap-4">
      <form onSubmit={handleCreateAdmin} className="admin-card">
        <h2 className="admin-card-title">Создать admin аккаунт</h2>

        {result && <div className="alert alert-success">{result}</div>}
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="mb-3">
          <label className="form-label">Email admin</label>
          <input
            type="email"
            className="form-control"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@example.com"
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label">Временный пароль</label>
          <input
            type="text"
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="minimum 6 symbols"
            required
            minLength={6}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Сохранение..." : "Создать admin"}
        </button>
      </form>

      <form onSubmit={handleCreateInvite} className="admin-card">
        <h2 className="admin-card-title">Создать invite для admin</h2>

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

        <button type="submit" className="btn btn-outline-primary" disabled={loading}>
          {loading ? "Создание..." : "Создать invite"}
        </button>
      </form>
    </div>
  );
}
