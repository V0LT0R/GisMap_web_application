import MapContainer from "@/components/map/MapContainer";
import { getStations } from "@/lib/api/stations";

export default async function MapPage() {
  const stations = await getStations();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Карта АЗС</h1>
        <p className="text-gray-600 mt-2">
          Геоинформационное отображение автозаправочных станций.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <MapContainer stations={stations} />
      </div>
    </section>
  );
}