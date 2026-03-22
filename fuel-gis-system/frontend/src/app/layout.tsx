export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="bg-gray-100 text-gray-900">
        <div className="min-h-screen flex">
          {/* Sidebar */}
          <aside className="w-64 bg-white shadow-md p-4">
            <h1 className="text-xl font-bold mb-6">Fuel GIS</h1>
            <nav className="space-y-2">
              <a href="/map" className="block hover:text-blue-500">Карта</a>
              <a href="/analytics" className="block hover:text-blue-500">Аналитика</a>
              <a href="/forecast" className="block hover:text-blue-500">Прогноз</a>
            </nav>
          </aside>

          {/* Content */}
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}