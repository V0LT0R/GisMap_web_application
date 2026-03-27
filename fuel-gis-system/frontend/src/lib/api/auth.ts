import type {
  LoginRequest,
  MessageResponse,
  TokenResponse,
  UserMe,
} from "@/types/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.detail || "Ошибка входа");
  }

  return res.json();
}

export async function getMe(token: string): Promise<UserMe> {
  const res = await fetch(`${API_URL}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.detail || "Не удалось получить пользователя");
  }

  return res.json();
}

export async function registerUser(payload: {
  email: string;
  password: string;
}): Promise<MessageResponse> {
  const res = await fetch(`${API_URL}/api/auth/register-user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.detail || "Ошибка регистрации");
  }

  return res.json();
}

export async function registerAdmin(payload: {
  invite_code: string;
  email: string;
  password: string;
}): Promise<MessageResponse> {
  const res = await fetch(`${API_URL}/api/auth/register-admin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.detail || "Ошибка регистрации admin");
  }

  return res.json();
}

export async function verifyEmail(payload: {
  email: string;
  code: string;
}): Promise<MessageResponse> {
  const res = await fetch(`${API_URL}/api/auth/verify-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.detail || "Ошибка подтверждения email");
  }

  return res.json();
}

export async function resendCode(payload: {
  email: string;
}): Promise<MessageResponse> {
  const res = await fetch(`${API_URL}/api/auth/resend-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.detail || "Ошибка отправки кода");
  }

  return res.json();
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}