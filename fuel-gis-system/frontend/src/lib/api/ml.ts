const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type MlForecastPoint = {
  hour: number;
  timestamp?: string;
  predictedLiters: number;
  vehicleCount: number;
};

export type MlModelMetrics = {
  model?: string;
  model_class?: string;
  train_rows?: number;
  test_rows?: number;
  features?: string[];
  MAE_liters?: number;
  RMSE_liters?: number;
  R2?: number;
  MAPE_percent?: number;
};

export type MlFuelDemandArtifacts = {
  metrics: MlModelMetrics;
  forecast: MlForecastPoint[];
  source?: {
    metrics_json?: string;
    model_joblib?: string;
    forecast_csv?: string;
  };
};

export async function getFuelDemandMlArtifacts(): Promise<MlFuelDemandArtifacts> {
  const res = await fetch(`${API_URL}/api/ml/fuel-demand`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Не удалось загрузить ML-метрики и прогноз");
  }

  return res.json();
}
