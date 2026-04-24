"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { getMe } from "@/lib/api/auth";
import { getToken, removeToken } from "@/lib/auth/token";

function getPageTitle(pathname: string) {
  if (pathname === "/admin") return "Dashboard";
  if (pathname === "/admin/stations") return "Управление АЗС";
  if (pathname === "/admin/users") return "Пользователи";
  if (pathname === "/admin/audit") return "Аудит";
  if (pathname === "/admin/presets") return "Пресеты";
  if (pathname === "/admin/login") return "Вход";
  if (pathname === "/admin/register") return "Регистрация admin";
  if (pathname === "/admin/verify") return "Подтверждение email";
  return "Fuel GIS Admin";
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const title = getPageTitle(pathname);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const isAuthPage =
    pathname === "/admin/login" ||
    pathname === "/admin/register" ||
    pathname === "/admin/verify";

  useEffect(() => {
    if (isAuthPage) {
      setCheckingAuth(false);
      return;
    }

    const token = getToken();
    if (!token) {
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    getMe(token)
      .then((user) => {
        if (user.role !== "admin" && user.role !== "super_admin") {
          removeToken();
          router.replace("/admin/login");
          return;
        }

        if (pathname === "/admin/users" && user.role !== "super_admin") {
          router.replace("/admin/stations");
          return;
        }

        setCheckingAuth(false);
      })
      .catch(() => {
        removeToken();
        router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
      });
  }, [isAuthPage, pathname, router]);

  if (isAuthPage) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(135deg, #dbeafe 0%, #eef2ff 45%, #f8fafc 100%)",
        }}
      >
        {children}
      </div>
    );
  }

  if (checkingAuth) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{ minHeight: "100vh" }}>
        <div className="alert alert-info mb-0">Проверка авторизации...</div>
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <AdminSidebar />

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-topbar-title">{title}</h1>
            <div className="admin-topbar-subtitle">
              Система управления топливными станциями
            </div>
          </div>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
