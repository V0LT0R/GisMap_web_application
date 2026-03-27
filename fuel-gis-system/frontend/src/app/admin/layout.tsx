"use client";

import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

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
  const title = getPageTitle(pathname);

  const isAuthPage =
    pathname === "/admin/login" ||
    pathname === "/admin/register" ||
    pathname === "/admin/verify";

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