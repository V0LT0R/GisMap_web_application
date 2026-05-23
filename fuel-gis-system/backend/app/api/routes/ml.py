from __future__ import annotations

import csv
import json
from pathlib import Path
from typing import Any

import joblib
from fastapi import APIRouter

router = APIRouter(prefix="/api/ml", tags=["ml"])


def _artifact_dir() -> Path:
    # backend/app/api/routes/ml.py -> backend/
    return Path(__file__).resolve().parents[3] / "ml_artifacts" / "fuel_demand"


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None or value == "":
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        if value is None or value == "":
            return default
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _load_metrics_from_json(artifact_dir: Path) -> dict[str, Any]:
    metrics_path = artifact_dir / "metrics.json"
    if not metrics_path.exists():
        return {}

    with metrics_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def _load_metrics_from_joblib(artifact_dir: Path) -> dict[str, Any]:
    model_path = artifact_dir / "fuel_demand_model.joblib"
    if not model_path.exists():
        return {}

    try:
        bundle = joblib.load(model_path)
    except Exception:
        return {}

    if isinstance(bundle, dict):
        metrics = bundle.get("metrics") or {}
        model = bundle.get("model")
        result = dict(metrics) if isinstance(metrics, dict) else {}
        if model is not None:
            result.setdefault("model_class", model.__class__.__name__)
        return result

    return {"model_class": bundle.__class__.__name__}


def _load_forecast(artifact_dir: Path) -> list[dict[str, Any]]:
    forecast_path = artifact_dir / "next_24h_forecast.csv"
    if not forecast_path.exists():
        return []

    forecast: list[dict[str, Any]] = []

    with forecast_path.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        for index, row in enumerate(reader):
            timestamp = row.get("timestamp") or row.get("date") or row.get("datetime") or ""
            hour = index
            if timestamp:
                try:
                    hour = int(str(timestamp)[11:13])
                except Exception:
                    hour = index

            forecast.append(
                {
                    "hour": hour,
                    "timestamp": timestamp,
                    "predictedLiters": round(
                        _safe_float(
                            row.get("predicted_fuel_consumption_liters")
                            or row.get("predicted")
                            or row.get("prediction")
                        ),
                        2,
                    ),
                    "vehicleCount": _safe_int(
                        row.get("vehicle_count_proxy")
                        or row.get("vehicle_count")
                        or row.get("vehicles")
                    ),
                }
            )

    return forecast


@router.get("/fuel-demand")
def get_fuel_demand_ml_artifacts():
    """Return ML metrics and 24-hour forecast from saved artifacts.

    The dashboard should not keep model quality values hardcoded in frontend files.
    This endpoint reads metrics.json, fuel_demand_model.joblib metadata, and
    next_24h_forecast.csv from backend/ml_artifacts/fuel_demand.
    """

    artifact_dir = _artifact_dir()

    metrics_from_json = _load_metrics_from_json(artifact_dir)
    metrics_from_joblib = _load_metrics_from_joblib(artifact_dir)

    metrics = {
        **metrics_from_joblib,
        **metrics_from_json,
    }

    forecast = _load_forecast(artifact_dir)

    return {
        "metrics": metrics,
        "forecast": forecast,
        "source": {
            "metrics_json": str(artifact_dir / "metrics.json"),
            "model_joblib": str(artifact_dir / "fuel_demand_model.joblib"),
            "forecast_csv": str(artifact_dir / "next_24h_forecast.csv"),
        },
    }
