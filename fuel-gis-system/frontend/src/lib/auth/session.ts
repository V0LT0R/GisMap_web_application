import { getMe } from "@/lib/api/auth";
import { getToken, removeToken } from "@/lib/auth/token";
import type { UserMe } from "@/types/auth";

export async function getCurrentSessionUser(): Promise<UserMe | null> {
  const token = getToken();
  if (!token) return null;

  try {
    return await getMe(token);
  } catch {
    removeToken();
    return null;
  }
}