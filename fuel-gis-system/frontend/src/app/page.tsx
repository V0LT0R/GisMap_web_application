import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-6">
      <div className="max-w-2xl rounded-2xl bg-white p-10 shadow-md text-center">
        <h1 className="text-4xl font-bold mb-4">Fuel GIS System</h1>
        <p className="text-gray-600 mb-6">
          Веб-приложение для аналитики, визуализации и прогнозирования
          потребления топлива на АЗС.
        </p>

        <Link
          href="/map"
          className="inline-block rounded-xl bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition"
        >
          Перейти к карте
        </Link>
      </div>
    </main>
  );
}