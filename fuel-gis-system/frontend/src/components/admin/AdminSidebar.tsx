"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { removeToken } from "@/lib/auth/token";
import { getCurrentSessionUser } from "@/lib/auth/session";
import type { UserMe } from "@/types/auth";

const links: Array<{ href: string; label: string; roles?: UserMe["role"][] }> = [
  { href: "/", label: "Назад на карту" },
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/stations", label: "Станции" },
  { href: "/admin/expansion", label: "Расширение сети" },
  { href: "/admin/users", label: "Пользователи", roles: ["super_admin"] },
  { href: "/admin/audit", label: "Аудит", roles: ["super_admin"] },
  { href: "/admin/presets", label: "Пресеты" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserMe | null>(null);

  useEffect(() => {
    getCurrentSessionUser().then(setUser);
  }, []);

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
        {links
          .filter((link) => !link.roles || (user && link.roles.includes(user.role)))
          .map((link) => {
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