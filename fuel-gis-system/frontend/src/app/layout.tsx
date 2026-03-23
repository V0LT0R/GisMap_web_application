import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fuel GIS System",
  description: "Геоинформационная система для аналитики и визуализации АЗС",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="m-0 p-0">{children}</body>
    </html>
  );
}