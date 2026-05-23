
"use client";

import { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { getAllStationsForAdmin } from "@/lib/api/admin";
import { getMyStations } from "@/lib/api/stations";
import { getCurrentSessionUser } from "@/lib/auth/session";
import { getToken } from "@/lib/auth/token";
import type { StationListItem } from "@/types/station";
import type { UserMe } from "@/types/auth";
import { ML_MODEL_METRICS, ML_NEXT_24H_FORECAST, estimateStationLoadScore, getStationVisitRecommendation, stationMlForecast24h } from "@/lib/analytics/mlFuelForecast";
import { getFuelDemandMlArtifacts, type MlFuelDemandArtifacts } from "@/lib/api/ml";

const DEMAND_ZONES = [
  { name: "EXPO / Туран", type: "Зона роста", lat: 51.0909, lon: 71.4182, demand: 94, radiusKm: 1.7, roadFactor: 0.86 },
  { name: "Улы Дала / новые ЖК", type: "ЖК", lat: 51.0872, lon: 71.4534, demand: 97, radiusKm: 1.8, roadFactor: 0.82 },
  { name: "Мангилик Ел / Кабанбай", type: "Основная дорога", lat: 51.1088, lon: 71.4317, demand: 88, radiusKm: 1.6, roadFactor: 0.96 },
  { name: "Сауран / Сыганак", type: "ЖК", lat: 51.1175, lon: 71.4057, demand: 82, radiusKm: 1.45, roadFactor: 0.78 },
  { name: "Коргалжынское шоссе", type: "Основная дорога", lat: 51.1817, lon: 71.3844, demand: 77, radiusKm: 1.9, roadFactor: 0.94 },
  { name: "Сарыарка / Республика", type: "Центр", lat: 51.1714, lon: 71.4246, demand: 74, radiusKm: 1.4, roadFactor: 0.88 },
  { name: "Аэропорт / трасса", type: "Основная дорога", lat: 51.0614, lon: 71.4541, demand: 86, radiusKm: 2.0, roadFactor: 0.98 },
  { name: "Абылай хана / Юго-Восток", type: "ЖК", lat: 51.1477, lon: 71.4895, demand: 72, radiusKm: 1.5, roadFactor: 0.74 },
];

const ASTANA_CENTER = { lat: 51.1694, lon: 71.4491 };

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const r = 6371;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestDemandZone(station: StationListItem) {
  if (station.latitude == null || station.longitude == null) return null;
  let best = DEMAND_ZONES[0];
  let bestDistance = Infinity;
  DEMAND_ZONES.forEach((zone) => {
    const distance = distanceKm(Number(station.latitude), Number(station.longitude), zone.lat, zone.lon);
    if (distance < bestDistance) {
      best = zone;
      bestDistance = distance;
    }
  });
  return { ...best, distanceKm: bestDistance };
}

function stationCongestion(station: StationListItem, index: number, allStations: StationListItem[]) {
  // The dashboard uses the same load estimation logic as the public map.
  // Therefore, the list of the most loaded stations matches the station cards on the map.
  return estimateStationLoadScore(station, index, allStations);
}

function forecastStationLiters(
  station: StationListItem,
  index: number,
  allStations: StationListItem[],
  forecastProfile: { predictedLiters: number }[]
) {
  const staticBaseSum = ML_NEXT_24H_FORECAST.reduce((sum, item) => sum + item.predictedLiters, 0) || 1;
  const dynamicBaseSum = forecastProfile.reduce((sum, item) => sum + item.predictedLiters, 0) || staticBaseSum;
  const staticStationForecast = stationMlForecast24h(station, index, allStations);

  return Math.round(staticStationForecast * (dynamicBaseSum / staticBaseSum));
}

function fuelDeficitCount(stations: StationListItem[]) {
  return stations.filter((station) => {
    const fuels = station.fuels || [];
    if (!fuels.length) return true;
    return fuels.filter((fuel) => fuel.is_available).length <= 1;
  }).length;
}

function formatLiters(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} млн л`;
  if (value >= 1000) return `${Math.round(value / 1000)} тыс. л`;
  return `${value} л`;
}

export default function AdminDashboardPage() {
  const [user, setUser] = useState<UserMe | null>(null);
  const [stations, setStations] = useState<StationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mlArtifacts, setMlArtifacts] = useState<MlFuelDemandArtifacts | null>(null);

  useEffect(() => {
    const load = async () => {
      const token = getToken();
      if (!token) {
        setLoading(false);
        setError("Не найден токен авторизации");
        return;
      }

      try {
        setLoading(true);
        setError("");
        const currentUser = await getCurrentSessionUser();
        setUser(currentUser);

        const data = currentUser?.role === "super_admin"
          ? await getAllStationsForAdmin(token)
          : await getMyStations(token);

        setStations(data);

        try {
          const artifacts = await getFuelDemandMlArtifacts();
          setMlArtifacts(artifacts);
        } catch (mlError) {
          console.warn("ML artifacts were not loaded, static fallback will be used", mlError);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить данные dashboard");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const analytics = useMemo(() => {
    const forecastProfile = mlArtifacts?.forecast?.length ? mlArtifacts.forecast : ML_NEXT_24H_FORECAST;

    const stationRows = stations.map((station, index) => {
      const zone = nearestDemandZone(station);
      const congestion = stationCongestion(station, index, stations);
      const forecast = forecastStationLiters(station, index, stations, forecastProfile);
      const visit = getStationVisitRecommendation(station, index, stations);
      return { station, zone, congestion, forecast, visit };
    });

    const avgCongestion = stationRows.length
      ? Math.round(stationRows.reduce((sum, row) => sum + row.congestion, 0) / stationRows.length)
      : 0;

    const zoneMap = new Map<string, { stations: number; forecast: number; congestionSum: number; demand: number; type: string }>();
    DEMAND_ZONES.forEach((zone) => {
      zoneMap.set(zone.name, { stations: 0, forecast: 0, congestionSum: 0, demand: zone.demand, type: zone.type });
    });

    stationRows.forEach((row) => {
      if (!row.zone) return;
      const current = zoneMap.get(row.zone.name) || { stations: 0, forecast: 0, congestionSum: 0, demand: row.zone.demand, type: row.zone.type };
      current.stations += 1;
      current.forecast += row.forecast;
      current.congestionSum += row.congestion;
      zoneMap.set(row.zone.name, current);
    });

    const zoneRows = Array.from(zoneMap.entries()).map(([name, value]) => {
      const avg = value.stations ? Math.round(value.congestionSum / value.stations) : 0;
      const risk = Math.max(0, Math.round(value.demand - value.stations * 18));
      return { name, ...value, avgCongestion: avg, risk };
    });

    const brandMap = new Map<string, { count: number; forecast: number }>();
    stationRows.forEach((row) => {
      const brand = row.station.brand || row.station.name || "Без бренда";
      const current = brandMap.get(brand) || { count: 0, forecast: 0 };
      current.count += 1;
      current.forecast += row.forecast;
      brandMap.set(brand, current);
    });

    const topBrands = Array.from(brandMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 6);

    const forecast = stationRows.reduce((sum, row) => sum + row.forecast, 0);
    const baseMlSum = forecastProfile.reduce((sum, item) => sum + item.predictedLiters, 0) || 1;
    const mlHourlyForecast = forecastProfile.map((item) => ({
      hour: `${String(item.hour).padStart(2, "0")}:00`,
      liters: Math.round((item.predictedLiters / baseMlSum) * forecast),
      vehicleCount: item.vehicleCount,
    }));
    const riskZones = zoneRows.filter((zone) => zone.risk >= 55 || (zone.demand >= 85 && zone.stations <= 1)).length;

    return {
      totalStations: stations.length,
      avgCongestion,
      forecast,
      riskZones,
      deficit: fuelDeficitCount(stations),
      highLoad: stationRows.filter((row) => row.congestion >= 75).length,
      mediumLoad: stationRows.filter((row) => row.congestion >= 45 && row.congestion < 75).length,
      lowLoad: stationRows.filter((row) => row.congestion < 45).length,
      topBrands,
      zoneRows: zoneRows.sort((a, b) => b.risk - a.risk).slice(0, 6),
      topLoaded: stationRows.sort((a, b) => b.congestion - a.congestion).slice(0, 5),
      mlHourlyForecast,
    };
  }, [stations, mlArtifacts]);

  const congestionOption = {
    tooltip: { trigger: "item" },
    legend: { bottom: 0 },
    series: [
      {
        name: "Загрузка",
        type: "pie",
        radius: ["48%", "72%"],
        avoidLabelOverlap: true,
        data: [
          { value: analytics.highLoad, name: "Высокая" },
          { value: analytics.mediumLoad, name: "Средняя" },
          { value: analytics.lowLoad, name: "Низкая" },
        ],
      },
    ],
  };

  const brandOption = {
    tooltip: { trigger: "axis" },
    grid: { left: 42, right: 16, top: 24, bottom: 76 },
    xAxis: {
      type: "category",
      data: analytics.topBrands.map(([name]) => name),
      axisLabel: { rotate: 25, interval: 0 },
    },
    yAxis: { type: "value" },
    series: [
      {
        name: "Количество АЗС",
        data: analytics.topBrands.map(([, data]) => data.count),
        type: "bar",
        barMaxWidth: 36,
      },
    ],
  };

  const zoneRiskOption = {
    tooltip: { trigger: "axis" },
    grid: { left: 42, right: 16, top: 24, bottom: 86 },
    xAxis: {
      type: "category",
      data: analytics.zoneRows.map((zone) => zone.name),
      axisLabel: { rotate: 25, interval: 0 },
    },
    yAxis: { type: "value", max: 100 },
    series: [
      {
        name: "Риск дефицита покрытия",
        data: analytics.zoneRows.map((zone) => zone.risk),
        type: "bar",
        barMaxWidth: 34,
      },
    ],
  };

  const forecastOption = {
    tooltip: { trigger: "axis" },
    grid: { left: 58, right: 16, top: 24, bottom: 42 },
    xAxis: {
      type: "category",
      data: analytics.mlHourlyForecast.map((item) => item.hour),
      axisLabel: { interval: 1, rotate: 25 },
    },
    yAxis: { type: "value" },
    series: [
      {
        name: "ML-прогноз, л/час",
        type: "line",
        smooth: true,
        areaStyle: {},
        data: analytics.mlHourlyForecast.map((item) => item.liters),
      },
    ],
  };

  const isSuperAdmin = user?.role === "super_admin";
  const mlMetrics = mlArtifacts?.metrics || ML_MODEL_METRICS;
  const mlModelName = (mlMetrics.model || mlMetrics.model_class || "ML").toString().toUpperCase();

  return (
    <div className="dashboard-page">
      <div className="dashboard-hero">
        <div>
          <h1>{isSuperAdmin ? "Super Admin Dashboard" : "Admin Dashboard"}</h1>
          <p>
            Сводная аналитика {isSuperAdmin ? "всей сети" : "назначенных АЗС"}: загрузка, прогноз расхода,
            зоны риска и дефицит топлива.
          </p>
        </div>
        <div className="dashboard-user-card">
          <span>Текущий пользователь</span>
          <strong>{user?.email || "-"}</strong>
          <small>{isSuperAdmin ? "super admin" : "admin"}</small>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="alert alert-info">Загрузка dashboard...</div>}

      <div className="dashboard-kpi-grid">
        <div className="dashboard-kpi-card blue">
          <span>Всего АЗС</span>
          <strong>{analytics.totalStations}</strong>
          <small>{isSuperAdmin ? "в базе системы" : "назначено администратору"}</small>
        </div>
        <div className="dashboard-kpi-card green">
          <span>Средняя загруженность</span>
          <strong>{analytics.avgCongestion}%</strong>
          <small>по зонам, дорогам и ЖК</small>
        </div>
        <div className="dashboard-kpi-card violet">
          <span>Прогноз расхода</span>
          <strong>{formatLiters(analytics.forecast)}</strong>
          <small>на следующие 24 часа</small>
        </div>
        <div className="dashboard-kpi-card orange">
          <span>Зоны риска</span>
          <strong>{analytics.riskZones}</strong>
          <small>дефицит покрытия</small>
        </div>
        <div className="dashboard-kpi-card red">
          <span>Дефицит топлива</span>
          <strong>{analytics.deficit}</strong>
          <small>АЗС с малым выбором топлива</small>
        </div>
        <div className="dashboard-kpi-card blue">
          <span>Качество ML-модели</span>
          <strong>R² {Number(mlMetrics.R2 ?? 0).toFixed(4)}</strong>
          <small>{mlModelName} · MAPE {Number(mlMetrics.MAPE_percent ?? 0).toFixed(2)}%</small>
        </div>
      </div>

      <div className="dashboard-chart-grid">
        <div className="admin-card dashboard-chart-card">
          <h2 className="admin-card-title">Структура загруженности</h2>
          <ReactECharts option={congestionOption} style={{ height: 310 }} />
        </div>

        <div className="admin-card dashboard-chart-card">
          <h2 className="admin-card-title">АЗС по брендам</h2>
          <ReactECharts option={brandOption} style={{ height: 310 }} />
        </div>

        <div className="admin-card dashboard-chart-card">
          <h2 className="admin-card-title">Риск по зонам Астаны</h2>
          <ReactECharts option={zoneRiskOption} style={{ height: 310 }} />
        </div>

        <div className="admin-card dashboard-chart-card">
          <h2 className="admin-card-title">Самые загруженные АЗС</h2>
          <div className="dashboard-mini-list">
            {analytics.topLoaded.map((row) => (
              <div key={row.station.id} className="dashboard-mini-row">
                <div>
                  <strong>{row.station.name || row.station.brand || "АЗС"}</strong>
                  <small>{row.zone?.name || "Зона не определена"}</small>
                  <small>Лучше: {row.visit.bestTime}</small>
                </div>
                <span>{row.congestion}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card dashboard-chart-card wide">
          <h2 className="admin-card-title">ML-прогноз расхода топлива на 24 часа</h2>
          <ReactECharts option={forecastOption} style={{ height: 320 }} />
        </div>
      </div>

    </div>
  );
}
