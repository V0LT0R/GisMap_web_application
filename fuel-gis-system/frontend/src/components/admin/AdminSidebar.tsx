"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { removeToken } from "@/lib/auth/token";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/stations", label: "Станции" },
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/audit", label: "Аудит" },
  { href: "/admin/presets", label: "Пресеты" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const logout = () => {
    removeToken();
    router.push("/admin/login");
  };

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <h2 className="admin-brand-title">Fuel GIS Admin</h2>
        <div className="admin-brand-subtitle">
          Управление АЗС, пользователями и ценами
        </div>
      </div>

      <nav className="admin-nav">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`admin-nav-link ${active ? "active" : ""}`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="admin-sidebar-footer">
        <button className="admin-logout-btn" onClick={logout}>
          Выйти
        </button>
      </div>
    </aside>
  );
}