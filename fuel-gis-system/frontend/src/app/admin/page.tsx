
"use client";

import { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import { getAllStationsForAdmin } from "@/lib/api/admin";
import { getMyStations } from "@/lib/api/stations";
import { getCurrentSessionUser } from "@/lib/auth/session";
import { getToken } from "@/lib/auth/token";
import type { StationListItem } from "@/types/station";
import type { UserMe } from "@/types/auth";

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

function stationCongestion(station: StationListItem, index: number) {
  const columns = Math.max(Number(station.columns_count || 4), 1);
  const zone = nearestDemandZone(station);
  const zoneDemand = zone ? zone.demand / 100 : 0.45;
  const roadBonus = zone && zone.distanceKm <= zone.radiusKm ? zone.roadFactor : 0.35;
  const residentialBonus = zone?.type === "ЖК" || zone?.type === "Зона роста" ? 0.18 : 0.08;
  const centerFactor = station.latitude && station.longitude
    ? Math.max(0, 1 - distanceKm(Number(station.latitude), Number(station.longitude), ASTANA_CENTER.lat, ASTANA_CENTER.lon) / 18)
    : 0.35;
  const fuelFactor = station.fuel_codes?.length ? Math.min(station.fuel_codes.length / 5, 1) : 0.35;
  const capacityPenalty = Math.max(0, 1 - columns / 12);
  const deterministicNoise = ((station.id * 41 + index * 19) % 17) / 100;

  return Math.round(
    Math.min(
      98,
      Math.max(
        10,
        (0.16 + zoneDemand * 0.32 + roadBonus * 0.2 + residentialBonus + centerFactor * 0.1 + fuelFactor * 0.08 + capacityPenalty * 0.16 + deterministicNoise) * 100
      )
    )
  );
}

function forecastStationLiters(station: StationListItem, index: number) {
  const congestion = stationCongestion(station, index);
  const columns = Math.max(Number(station.columns_count || 4), 1);
  const fuelVariety = station.fuel_codes?.length ? Math.max(1, station.fuel_codes.length) : 2;
  return Math.round(columns * 560 * (congestion / 100) * (0.8 + fuelVariety * 0.12));
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось загрузить данные dashboard");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const analytics = useMemo(() => {
    const stationRows = stations.map((station, index) => {
      const zone = nearestDemandZone(station);
      const congestion = stationCongestion(station, index);
      const forecast = forecastStationLiters(station, index);
      return { station, zone, congestion, forecast };
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
    };
  }, [stations]);

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
    grid: { left: 58, right: 16, top: 24, bottom: 36 },
    xAxis: { type: "category", data: ["Сегодня", "+1 день", "+2 дня", "+3 дня", "+4 дня"] },
    yAxis: { type: "value" },
    series: [
      {
        name: "Прогноз, л",
        type: "line",
        smooth: true,
        areaStyle: {},
        data: [
          analytics.forecast,
          Math.round(analytics.forecast * (1 + analytics.avgCongestion / 900)),
          Math.round(analytics.forecast * (0.96 + analytics.riskZones / 100)),
          Math.round(analytics.forecast * (1.02 + analytics.highLoad / Math.max(1, analytics.totalStations * 12))),
          Math.round(analytics.forecast * (0.98 + analytics.deficit / Math.max(1, analytics.totalStations * 10))),
        ],
      },
    ],
  };

  const isSuperAdmin = user?.role === "super_admin";

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
                </div>
                <span>{row.congestion}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-card dashboard-chart-card wide">
          <h2 className="admin-card-title">Мини-прогноз расхода топлива</h2>
          <ReactECharts option={forecastOption} style={{ height: 320 }} />
        </div>
      </div>

      <div className="admin-card dashboard-note">
        <h2 className="admin-card-title">Как считается аналитика</h2>
        <p>
          Dashboard теперь зависит от реального набора АЗС пользователя: учитываются количество колонок,
          доступность топлива, близость к основным дорогам, расположение возле ЖК/зон роста и плотность покрытия
          в районах Астаны. Поэтому у разных администраторов графики и KPI будут отличаться.
        </p>
      </div>
    </div>
  );
}
