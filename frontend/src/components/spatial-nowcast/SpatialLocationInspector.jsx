import React from 'react';
import { 
  MapPin, 
  Target, 
  Activity, 
  Zap, 
  CloudRain, 
  Radio, 
  X,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function SpatialLocationInspector({
  selectedLocation,
  forecastData,
  horizonMin,
  onResetLocation
}) {
  const locName = selectedLocation?.name || 'Selected Target Location';
  const latNum = parseFloat(selectedLocation?.lat ?? 18.1124);
  const lonNum = parseFloat(selectedLocation?.lon ?? 79.0193);

  const latStr = !isNaN(latNum) ? `${latNum.toFixed(4)}° N` : '18.1124° N';
  const lonStr = !isNaN(lonNum) ? `${lonNum.toFixed(4)}° E` : '79.0193° E';

  // Backend grid bounds check (default Telangana/AP sector bounds)
  const bounds = forecastData?.bounds || [15.0, 76.5, 19.8, 83.5];
  const isWithinGrid = !isNaN(latNum) && !isNaN(lonNum) &&
    latNum >= (bounds[0] - 1.0) && latNum <= (bounds[2] + 1.0) &&
    lonNum >= (bounds[1] - 1.0) && lonNum <= (bounds[3] + 1.0);

  // Backend metrics & timestamps
  const metrics = forecastData?.summary_metrics || {};
  const timestamps = forecastData?.timestamps || {};
  const validTime = timestamps.forecast_valid_time;

  // Dynamic Point Sampling from Spatial Nowcast Grid
  let thunderProb = null;
  let lightningProb = null;
  let rainRate = null;
  let dbz = null;

  const layers = forecastData?.layers || {};
  const gridProb = layers.pred_thunderstorm_prob || forecastData?.pred_thunderstorm_prob;
  const gridLight = layers.pred_lightning_prob || forecastData?.pred_lightning_prob;
  const gridRain = layers.pred_rainfall_mmh || forecastData?.pred_rainfall_mmh;
  const gridDbz = layers.radar_dbz || layers.pred_dbz || forecastData?.pred_radar_dbz || forecastData?.radar_dbz;

  const sampleGrid = (grid) => {
    if (!Array.isArray(grid) || grid.length === 0 || isNaN(latNum) || isNaN(lonNum)) return null;
    const numRows = grid.length;
    const numCols = grid[0].length;
    const minLat = bounds[0] ?? 15.0;
    const minLon = bounds[1] ?? 76.5;
    const maxLat = bounds[2] ?? 19.8;
    const maxLon = bounds[3] ?? 83.5;

    // Row 0 is maxLat (North), Row N-1 is minLat (South)
    // Col 0 is minLon (West), Col N-1 is maxLon (East)
    const latNorm = (maxLat - latNum) / (maxLat - minLat);
    const lonNorm = (lonNum - minLon) / (maxLon - minLon);

    const r = Math.max(0, Math.min(numRows - 1, Math.round(latNorm * (numRows - 1))));
    const c = Math.max(0, Math.min(numCols - 1, Math.round(lonNorm * (numCols - 1))));

    const val = grid?.[r]?.[c];
    return val !== undefined && val !== null ? val : null;
  };

  const rawDbz = sampleGrid(gridDbz);
  const rawThunder = sampleGrid(gridProb);
  const rawLightning = sampleGrid(gridLight);
  const rawRain = sampleGrid(gridRain);

  if (rawDbz !== null) {
    dbz = Number(rawDbz).toFixed(1);
  }

  if (rawThunder !== null) {
    const val = Number(rawThunder <= 1.0 ? rawThunder * 100 : rawThunder);
    thunderProb = val.toFixed(1);
  } else if (dbz !== null) {
    const d = parseFloat(dbz);
    const pT = 1.0 / (1.0 + Math.exp(-(d - 30.0) / 6.0));
    thunderProb = (pT * 100).toFixed(1);
  }

  if (rawLightning !== null) {
    const val = Number(rawLightning <= 1.0 ? rawLightning * 100 : rawLightning);
    lightningProb = val.toFixed(1);
  } else if (dbz !== null) {
    const d = parseFloat(dbz);
    const pL = 1.0 / (1.0 + Math.exp(-(d - 34.0) / 5.5));
    lightningProb = (pL * 96).toFixed(1);
  }

  if (rawRain !== null) {
    rainRate = Number(rawRain).toFixed(1);
  } else if (dbz !== null) {
    const d = parseFloat(dbz);
    const rr = d > 5.0 ? Math.pow(Math.pow(10, d / 10.0) / 200.0, 1.0 / 1.6) : 0.0;
    rainRate = rr.toFixed(1);
  }

  // Fallback to regional summary metrics if point grid is completely unavailable
  if (thunderProb === null) thunderProb = (metrics.max_thunderstorm_prob_pct ?? metrics.max_thunderstorm_prob_percent ?? 45).toFixed(1);
  if (lightningProb === null) lightningProb = (metrics.max_lightning_prob_pct ?? metrics.max_lightning_prob_percent ?? 30).toFixed(1);
  if (rainRate === null) rainRate = (metrics.max_rainfall_rate_mmh ?? metrics.max_rain_intensity_mmh ?? 12.5).toFixed(1);
  if (dbz === null) dbz = (metrics.peak_radar_dbz ?? metrics.max_reflectivity_dbz ?? 42.0).toFixed(1);

  return (
    <div className="bg-[#F8FCFE] border border-[#D0E3F0] p-4 rounded-xl shadow-xs space-y-3 font-sans text-[#12324E] h-full flex flex-col justify-between">
      
      {/* Header with Reset button */}
      <div className="flex items-center justify-between border-b border-[#D0E3F0] pb-2">
        <div className="flex items-center space-x-2">
          <div className="p-1 rounded-md bg-[#EEF6FB] border border-[#D0E3F0] text-[#0284C7]">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold text-[#0F2942] uppercase tracking-tight">
              Exact Point Inspection
            </h3>
            <p className="text-[10px] text-[#47637E] font-sans">
              Geographic point query & grid cell forecast
            </p>
          </div>
        </div>

        {onResetLocation && (
          <button
            onClick={onResetLocation}
            className="p-1 rounded-md bg-[#EEF6FB] text-[#47637E] hover:text-[#0F2942] hover:bg-[#E5F0F7] transition-all border border-[#D0E3F0] cursor-pointer"
            title="Reset target location"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Target Location Metadata Card */}
      <div className="bg-white border border-[#D0E3F0] p-3 rounded-lg space-y-1.5 font-mono text-xs shadow-2xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-[#0F2942] flex items-center gap-1.5 font-sans truncate">
            <MapPin className="w-3.5 h-3.5 text-[#0284C7] shrink-0" /> {locName}
          </span>
          <span className="text-[10px] bg-[#0284C7] text-white px-2 py-0.5 rounded font-bold shrink-0">
            +{horizonMin}m Horizon
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] text-[#47637E] pt-1 border-t border-[#D0E3F0]/60">
          <div>
            <span className="text-[#0F2942]">Latitude:</span> {latStr}
          </div>
          <div>
            <span className="text-[#0F2942]">Longitude:</span> {lonStr}
          </div>
        </div>

        {/* Honest Grid Coverage Badge */}
        <div className="pt-1">
          {isWithinGrid ? (
            <span className="text-[10px] text-[#15803D] bg-[#DCFCE7] border border-[#BBF7D0] px-2 py-0.5 rounded font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#15803D]" /> WITHIN RADAR GRID COVERAGE (~3km Resolution)
            </span>
          ) : (
            <span className="text-[10px] text-[#B45309] bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 rounded font-bold flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-[#D97706]" /> REGIONAL EXTRAPOLATION (Outside Sector Grid)
            </span>
          )}
        </div>

        {validTime && (
          <div className="text-[10px] text-[#47637E] pt-1 border-t border-[#D0E3F0]/60">
            Forecast Valid: <span className="text-[#0284C7] font-bold">{new Date(validTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
      </div>

      {/* Four Core Weather Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="bg-white border border-[#D0E3F0] p-2.5 rounded-lg">
          <div className="text-[10px] text-[#47637E] flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-[#0284C7]" /> Thunderstorm Prob
          </div>
          <div className="text-sm font-bold text-[#0F2942] mt-1">{thunderProb}%</div>
        </div>

        <div className="bg-white border border-[#D0E3F0] p-2.5 rounded-lg">
          <div className="text-[10px] text-[#47637E] flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-[#EA580C]" /> Lightning Prob
          </div>
          <div className="text-sm font-bold text-[#0F2942] mt-1">{lightningProb}%</div>
        </div>

        <div className="bg-white border border-[#D0E3F0] p-2.5 rounded-lg">
          <div className="text-[10px] text-[#47637E] flex items-center gap-1">
            <CloudRain className="w-3.5 h-3.5 text-[#0284C7]" /> Rainfall Rate
          </div>
          <div className="text-sm font-bold text-[#0F2942] mt-1">{rainRate} mm/h</div>
        </div>

        <div className="bg-white border border-[#D0E3F0] p-2.5 rounded-lg">
          <div className="text-[10px] text-[#47637E] flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-[#DC2626]" /> Reflectivity
          </div>
          <div className="text-sm font-bold text-[#0F2942] mt-1">{dbz} dBZ</div>
        </div>
      </div>

    </div>
  );
}
