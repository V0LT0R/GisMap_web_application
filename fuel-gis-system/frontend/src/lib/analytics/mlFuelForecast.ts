import type { StationFull, StationListItem } from "@/types/station";

export type MlForecastPoint = {
  hour: number;
  predictedLiters: number;
  vehicleCount: number;
};

export type VisitRecommendation = {
  status: "low" | "medium" | "high";
  contextLabel: string;
  bestTime: string;
  avoidTime: string;
  reason: string;
  loadScore: number;
  forecast24hLiters: number;
};

export const ML_MODEL_METRICS = {
  "model": "xgboost",
  "train_rows": 633,
  "test_rows": 159,
  "features": [
    "hour",
    "weekday",
    "month",
    "is_holiday",
    "event",
    "day",
    "is_weekend",
    "hour_sin",
    "hour_cos",
    "month_sin",
    "month_cos",
    "prev_hour_sales",
    "prev_2_hour_sales",
    "prev_24_hour_sales",
    "rolling_3h_mean",
    "rolling_6h_mean",
    "rolling_24h_mean",
    "vehicle_count",
    "real_brent_price",
    "weekly_supply"
  ],
  "MAE_liters": 36.0553,
  "RMSE_liters": 49.8137,
  "R2": 0.8753,
  "MAPE_percent": 16.7921
} as const;

export const ML_NEXT_24H_FORECAST: MlForecastPoint[] = [
  {
    "hour": 0,
    "predictedLiters": 48.36,
    "vehicleCount": 12
  },
  {
    "hour": 1,
    "predictedLiters": 30.76,
    "vehicleCount": 12
  },
  {
    "hour": 2,
    "predictedLiters": 24.91,
    "vehicleCount": 12
  },
  {
    "hour": 3,
    "predictedLiters": 28.24,
    "vehicleCount": 14
  },
  {
    "hour": 4,
    "predictedLiters": 30.87,
    "vehicleCount": 17
  },
  {
    "hour": 5,
    "predictedLiters": 59.48,
    "vehicleCount": 24
  },
  {
    "hour": 6,
    "predictedLiters": 189.23,
    "vehicleCount": 35
  },
  {
    "hour": 7,
    "predictedLiters": 226.36,
    "vehicleCount": 46
  },
  {
    "hour": 8,
    "predictedLiters": 342.94,
    "vehicleCount": 50
  },
  {
    "hour": 9,
    "predictedLiters": 342.99,
    "vehicleCount": 46
  },
  {
    "hour": 10,
    "predictedLiters": 264.36,
    "vehicleCount": 53
  },
  {
    "hour": 11,
    "predictedLiters": 291.31,
    "vehicleCount": 43
  },
  {
    "hour": 12,
    "predictedLiters": 229.27,
    "vehicleCount": 36
  },
  {
    "hour": 13,
    "predictedLiters": 279.53,
    "vehicleCount": 35
  },
  {
    "hour": 14,
    "predictedLiters": 306.99,
    "vehicleCount": 39
  },
  {
    "hour": 15,
    "predictedLiters": 255.89,
    "vehicleCount": 48
  },
  {
    "hour": 16,
    "predictedLiters": 326.43,
    "vehicleCount": 60
  },
  {
    "hour": 17,
    "predictedLiters": 395.35,
    "vehicleCount": 70
  },
  {
    "hour": 18,
    "predictedLiters": 397.96,
    "vehicleCount": 74
  },
  {
    "hour": 19,
    "predictedLiters": 330.79,
    "vehicleCount": 70
  },
  {
    "hour": 20,
    "predictedLiters": 253.99,
    "vehicleCount": 59
  },
  {
    "hour": 21,
    "predictedLiters": 193.25,
    "vehicleCount": 48
  },
  {
    "hour": 22,
    "predictedLiters": 165.68,
    "vehicleCount": 21
  },
  {
    "hour": 23,
    "predictedLiters": 73.83,
    "vehicleCount": 16
  }
];

const ASTANA_CENTER = { lat: 51.1694, lon: 71.4491 };

const DEMAND_ZONES = [
  { name: "EXPO / Туран", type: "Зона роста", lat: 51.0909, lon: 71.4182, demand: 86, radiusKm: 1.25, roadFactor: 0.86 },
  { name: "Улы Дала / новые ЖК", type: "ЖК", lat: 51.0872, lon: 71.4534, demand: 90, radiusKm: 1.25, roadFactor: 0.82 },
  { name: "Мангилик Ел / Кабанбай", type: "Основная дорога", lat: 51.1088, lon: 71.4317, demand: 84, radiusKm: 1.15, roadFactor: 0.92 },
  { name: "Сауран / Сыганак", type: "ЖК", lat: 51.1175, lon: 71.4057, demand: 76, radiusKm: 1.05, roadFactor: 0.74 },
  { name: "Коргалжынское шоссе", type: "Основная дорога", lat: 51.1817, lon: 71.3844, demand: 70, radiusKm: 1.25, roadFactor: 0.86 },
  { name: "Сарыарка / Республика", type: "Центр", lat: 51.1714, lon: 71.4246, demand: 68, radiusKm: 1.0, roadFactor: 0.78 },
  { name: "Аэропорт / трасса", type: "Основная дорога", lat: 51.0614, lon: 71.4541, demand: 82, radiusKm: 1.35, roadFactor: 0.92 },
  { name: "Абылай хана / Юго-Восток", type: "ЖК", lat: 51.1477, lon: 71.4895, demand: 66, radiusKm: 1.0, roadFactor: 0.68 },
  { name: "Тәуелсіздік / Нажимеденова", type: "ЖК", lat: 51.1328, lon: 71.4701, demand: 72, radiusKm: 0.95, roadFactor: 0.76 },
  { name: "Казахстан спорткомплекс / Жирентаева", type: "Спокойная зона", lat: 51.1214, lon: 71.5108, demand: 48, radiusKm: 0.75, roadFactor: 0.48 },
  { name: "Железнодорожный вокзал", type: "Транспортный узел", lat: 51.1902, lon: 71.4099, demand: 74, radiusKm: 1.0, roadFactor: 0.78 },
  { name: "Новый административный центр", type: "Центр", lat: 51.1274, lon: 71.4466, demand: 78, radiusKm: 0.9, roadFactor: 0.82 },
];

type StationLike = Partial<StationListItem> & {
  station?: StationFull["station"];
  details?: StationFull["details"];
};

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

function getCoordinates(station: StationLike) {
  const lat = station.latitude ?? station.station?.latitude ?? null;
  const lon = station.longitude ?? station.station?.longitude ?? null;
  if (lat == null || lon == null) return null;
  return { lat: Number(lat), lon: Number(lon) };
}

function getColumnsCount(station: StationLike) {
  return Math.max(Number(station.columns_count ?? station.details?.columns_count ?? 4), 1);
}

function getFuelCount(station: StationLike) {
  const codes = station.fuel_codes;
  if (codes?.length) return codes.length;
  const full = station as StationFull;
  if (Array.isArray(full.fuels)) return Math.max(full.fuels.filter((fuel) => fuel.is_available).length, 1);
  return 2;
}

function getAstanaHour() {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Almaty",
      hour: "2-digit",
      hour12: false,
    }).format(new Date())
  );
}

function peakLoadByHour(hour: number) {
  const morningPeak = Math.exp(-((hour - 8) ** 2) / 7);
  const eveningPeak = Math.exp(-((hour - 18) ** 2) / 8);
  const lunchPeak = Math.exp(-((hour - 13) ** 2) / 18) * 0.35;
  return Math.min(1, morningPeak * 0.85 + eveningPeak + lunchPeak);
}

function countNearbyStations(station: StationLike, allStations: StationLike[], radiusKm: number) {
  const coords = getCoordinates(station);
  if (!coords) return 0;

  const currentId = station.id ?? station.station?.id ?? null;

  return allStations.filter((candidate) => {
    const candidateCoords = getCoordinates(candidate);
    if (!candidateCoords) return false;

    const candidateId = candidate.id ?? candidate.station?.id ?? null;
    if (currentId != null && candidateId === currentId) return false;

    return distanceKm(coords.lat, coords.lon, candidateCoords.lat, candidateCoords.lon) <= radiusKm;
  }).length;
}

function getCompetitionMultiplier(nearbyCount: number) {
  if (nearbyCount >= 10) return 0.38;
  if (nearbyCount >= 7) return 0.46;
  if (nearbyCount >= 5) return 0.56;
  if (nearbyCount >= 3) return 0.68;
  if (nearbyCount >= 1) return 0.82;
  return 1;
}

export function nearestDemandZone(station: StationLike) {
  const coords = getCoordinates(station);
  if (!coords) return null;

  let best = DEMAND_ZONES[0];
  let bestDistance = Infinity;

  DEMAND_ZONES.forEach((zone) => {
    const distance = distanceKm(coords.lat, coords.lon, zone.lat, zone.lon);
    if (distance < bestDistance) {
      best = zone;
      bestDistance = distance;
    }
  });

  return { ...best, distanceKm: bestDistance };
}

export function estimateStationLoadScore(station: StationLike, index = 0, allStations: StationLike[] = []) {
  const columns = getColumnsCount(station);
  const zone = nearestDemandZone(station);
  const zoneDemand = zone ? zone.demand / 100 : 0.42;
  const isInsideDemandZone = Boolean(zone && zone.distanceKm <= zone.radiusKm);
  const roadBonus = isInsideDemandZone ? zone!.roadFactor : 0.28;
  const residentialBonus = isInsideDemandZone && (zone?.type === "ЖК" || zone?.type === "Зона роста") ? 0.14 : 0.04;
  const coords = getCoordinates(station);
  const centerFactor = coords
    ? Math.max(0, 1 - distanceKm(coords.lat, coords.lon, ASTANA_CENTER.lat, ASTANA_CENTER.lon) / 18)
    : 0.32;
  const fuelFactor = Math.min(getFuelCount(station) / 5, 1);
  const capacityPenalty = Math.max(0, 1 - columns / 12);
  const id = Number(station.id ?? station.station?.id ?? 0);
  const deterministicNoise = ((id * 41 + index * 19) % 13) / 100;

  const nearby1Km = countNearbyStations(station, allStations, 1);
  const nearby2Km = countNearbyStations(station, allStations, 2);
  const competitionMultiplier = getCompetitionMultiplier(nearby1Km) * (nearby2Km >= 8 ? 0.82 : nearby2Km >= 5 ? 0.9 : 1);
  const astanaHour = getAstanaHour();
  const currentTimeMultiplier = 0.78 + peakLoadByHour(astanaHour) * 0.42;
  const weakLocationPenalty = isInsideDemandZone ? 1 : 0.62;

  const baseScore =
    (0.12 +
      zoneDemand * 0.26 +
      roadBonus * 0.18 +
      residentialBonus +
      centerFactor * 0.08 +
      fuelFactor * 0.06 +
      capacityPenalty * 0.1 +
      deterministicNoise) *
    100;

  return Math.round(
    Math.min(
      96,
      Math.max(8, baseScore * competitionMultiplier * currentTimeMultiplier * weakLocationPenalty)
    )
  );
}

export function stationMlForecast24h(station: StationLike, index = 0, allStations: StationLike[] = []) {
  const loadScore = estimateStationLoadScore(station, index, allStations);
  const columns = getColumnsCount(station);
  const fuelCount = getFuelCount(station);
  const zone = nearestDemandZone(station);
  const zoneMultiplier = zone && zone.distanceKm <= zone.radiusKm ? 1 + zone.demand / 260 : 1;
  const capacityMultiplier = 0.55 + columns / 10;
  const fuelMultiplier = 0.85 + fuelCount * 0.08;
  const stableNoise = 0.92 + (((Number(station.id ?? station.station?.id ?? 0) + index * 7) % 13) / 100);
  const baseMlForecast = ML_NEXT_24H_FORECAST.reduce((sum, item) => sum + item.predictedLiters, 0);

  return Math.round(baseMlForecast * zoneMultiplier * capacityMultiplier * fuelMultiplier * stableNoise * (0.65 + loadScore / 170));
}

export function stationHourlyForecast(station: StationLike, index = 0, allStations: StationLike[] = []) {
  const daily = stationMlForecast24h(station, index, allStations);
  const baseSum = ML_NEXT_24H_FORECAST.reduce((sum, item) => sum + item.predictedLiters, 0) || 1;
  return ML_NEXT_24H_FORECAST.map((item) => ({
    hour: item.hour,
    liters: Math.round((item.predictedLiters / baseSum) * daily),
    vehicleCount: item.vehicleCount,
  }));
}

export function getStationVisitRecommendation(station: StationLike, index = 0, allStations: StationLike[] = []): VisitRecommendation {
  const loadScore = estimateStationLoadScore(station, index, allStations);
  const forecast24hLiters = stationMlForecast24h(station, index, allStations);
  const zone = nearestDemandZone(station);
  const context = zone?.name || "обычная городская зона";
  const zoneType = zone?.type || "городская зона";
  const nearby1Km = countNearbyStations(station, allStations, 1);
  const nearby2Km = countNearbyStations(station, allStations, 2);
  const astanaHour = getAstanaHour();
  const peakNow = peakLoadByHour(astanaHour);
  const timeText = `${String(astanaHour).padStart(2, "0")}:00, Астана`;
  const competitionText = nearby1Km > 0
    ? ` В радиусе 1 км есть ещё ${nearby1Km} АЗС, поэтому поток распределяется между несколькими станциями.`
    : " Поблизости мало альтернативных АЗС, поэтому спрос концентрируется сильнее.";

  if (loadScore >= 72) {
    const bestTime = nearby1Km >= 3 ? "10:30–16:30 или после 21:00" : "11:30–15:30 или после 21:30";
    const avoidTime = nearby1Km >= 3 ? "08:00–09:30 и 17:30–19:30" : "07:00–10:00 и 17:00–20:30";

    return {
      status: "high",
      contextLabel: `${context} · высокая проходимость`,
      bestTime,
      avoidTime,
      reason: `Сейчас ${timeText}. АЗС расположена рядом с зоной «${context}» (${zoneType}). ${peakNow > 0.65 ? "Текущее время близко к пиковому периоду." : "Сейчас не самый высокий пик."}${competitionText}`,
      loadScore,
      forecast24hLiters,
    };
  }

  if (loadScore >= 45) {
    return {
      status: "medium",
      contextLabel: `${context} · средняя проходимость`,
      bestTime: nearby1Km >= 3 ? "10:00–17:30 или после 20:30" : "10:00–17:00 или после 21:00",
      avoidTime: "08:00–09:30 и 18:00–19:30",
      reason: `Сейчас ${timeText}. Станция находится в зоне умеренного спроса.${competitionText} Очереди возможны в часы поездок на работу и возвращения домой.`,
      loadScore,
      forecast24hLiters,
    };
  }

  return {
    status: "low",
    contextLabel: `${context} · спокойная зона`,
    bestTime: "09:00–18:30",
    avoidTime: nearby2Km >= 5 ? "выраженных пиков почти нет" : "08:00–09:00 и 18:00–19:00",
    reason: `Сейчас ${timeText}. Загрузка снижена, потому что рядом есть альтернативные АЗС или станция находится вне сильной зоны спроса.${competitionText}`,
    loadScore,
    forecast24hLiters,
  };
}

export function formatLiters(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} млн л`;
  if (value >= 1000) return `${Math.round(value / 1000)} тыс. л`;
  return `${value} л`;
}
