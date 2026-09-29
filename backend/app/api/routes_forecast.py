"""
Forecast & Nowcast API Router
"""
from fastapi import APIRouter, Query
from app.services.forecast_engine import forecast_engine
from app.config import config

router = APIRouter(prefix="/api/forecast", tags=["Forecast"])

@router.get("/latest")
def get_latest_nowcast(
    horizon_min: int = Query(30, description="Forecast lead time in minutes (15, 30, 45, 60, 90, 120, 180)"),
    event_id: str = Query("LIVE", description="Event ID: LIVE, HYD-PREMONSOON-2024, ODISHA-KALBAISAKHI-2024, etc."),
    t_offset_minutes: int = Query(0, description="Timeline playback offset in minutes"),
    region_name: str = Query(None, description="Selected Region or State name"),
    lat: float = Query(None, description="Target Latitude"),
    lon: float = Query(None, description="Target Longitude"),
    min_lat: float = Query(None, description="Bounding Area Min Latitude"),
    max_lat: float = Query(None, description="Bounding Area Max Latitude"),
    min_lon: float = Query(None, description="Bounding Area Min Longitude"),
    max_lon: float = Query(None, description="Bounding Area Max Longitude")
):
    return forecast_engine.get_complete_nowcast(
        horizon_min=horizon_min,
        event_id=event_id,
        t_offset_minutes=t_offset_minutes,
        region_name=region_name,
        lat=lat, lon=lon,
        min_lat=min_lat, max_lat=max_lat,
        min_lon=min_lon, max_lon=max_lon
    )

@router.get("/horizons")
def get_available_horizons():
    return {
        "available_horizons_minutes": config.HORIZONS_MINUTES,
        "default_horizon_minutes": 30
    }

@router.get("/area")
def analyze_area_nowcast(
    lat: float = Query(None, description="Target Latitude for Point Selection"),
    lon: float = Query(None, description="Target Longitude for Point Selection"),
    min_lat: float = Query(None, description="Bounding Area Min Latitude"),
    max_lat: float = Query(None, description="Bounding Area Max Latitude"),
    min_lon: float = Query(None, description="Bounding Area Min Longitude"),
    max_lon: float = Query(None, description="Bounding Area Max Longitude"),
    horizon_min: int = Query(30, description="Lead time horizon in minutes"),
    event_id: str = Query("LIVE", description="Event ID")
):
    return forecast_engine.analyze_area_nowcast(
        lat=lat, lon=lon,
        min_lat=min_lat, max_lat=max_lat,
        min_lon=min_lon, max_lon=max_lon,
        horizon_min=horizon_min, event_id=event_id
    )

@router.get("/model-metrics")
def get_model_metrics():
    """
    Returns validation metrics, target definitions, training dataset parameters, and model provenance.
    """
    import os, json
    report_path = os.path.join(os.path.dirname(__file__), "..", "weights", "training_report.json")
    if os.path.exists(report_path):
        with open(report_path, "r") as f:
            return json.load(f)
    return {
        "status": "UNAVAILABLE",
        "reason": "Training report file not found"
    }

@router.get("/ml-nowcast")
def get_ml_nowcast(
    horizon_min: int = Query(30, description="Forecast lead time in minutes (15, 30, 45, 60, 90, 120, 180)"),
    roi_name: str = Query("AP_TELANGANA", description="Region of Interest")
):
    """
    Executes direct ML nowcasting model inference on calibrated INSAT-3DS sequence frames.
    """
    from app.services.insat_3ds_processor import insat_processor
    from app.models.spatiotemporal_net import ai_engine
    from app.services.data_harmonizer import harmonizer

    inventory = insat_processor.scan_inventory()
    cube = harmonizer.get_convective_cube(data_mode="real")
    tensor_4d = cube["tensor"]

    predictions = ai_engine.predict_horizons(tensor_4d=tensor_4d, horizons_min=[horizon_min])
    selected = predictions.get(horizon_min, list(predictions.values())[0])

    return {
        "status": "success",
        "horizon_minutes": horizon_min,
        "roi_name": roi_name,
        "model_status": ai_engine.model_status,
        "inference_mode": ai_engine.inference_mode,
        "model_provenance": ai_engine.get_model_provenance(),
        "input_inventory_scans": len(inventory),
        "prediction": {
            "p_thunderstorm_max": round(float(selected["p_thunderstorm"].max()), 4),
            "p_lightning_max": round(float(selected["p_lightning"].max()), 4),
            "rainfall_max_mmh": round(float(selected["rainfall_mmh"].max()), 2),
            "pred_dbz_max": round(float(selected["pred_dbz"].max()), 2),
            "uncertainty_index": selected["uncertainty_index"],
            "inference_engine": selected["inference_engine"]
        }
    }


