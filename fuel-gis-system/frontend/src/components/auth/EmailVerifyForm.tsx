"use client";

import { useState } from "react";
import { verifyEmail, resendCode } from "@/lib/api/auth";

export default function EmailVerifyForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const data = await verifyEmail({ email, code });
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка подтверждения");
    }
  };

  const handleResend = async () => {
    setMessage("");
    setError("");

    try {
      const data = await resendCode({ email });
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка отправки кода");
    }
  };

  return (
    <form onSubmit={handleVerify} className="card shadow-sm p-4">
      <h2 className="mb-3">Подтверждение email</h2>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="mb-3">
        <label className="form-label">Email</label>
        <input
          type="email"
          className="form-control"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="mb-3">
        <label className="form-label">Код</label>
        <input
          className="form-control"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
        />
      </div>

      <div className="d-flex gap-2">
        <button type="submit" className="btn btn-primary">
          Подтвердить
        </button>

        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleResend}
        >
          Отправить код заново
        </button>
      </div>
    </form>
  );
}