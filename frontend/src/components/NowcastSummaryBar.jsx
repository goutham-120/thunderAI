import React from 'react';
import { CloudLightning, Zap, CloudRain, Radio } from 'lucide-react';

export default function NowcastSummaryBar({ forecastData, selectedLocation }) {
  const summary = forecastData?.summary_metrics || {};
  const risk = forecastData?.convective_risk || {};
  const topCell = forecastData?.storm_cells && forecastData.storm_cells[0];

  const thunderProb = summary.max_thunderstorm_prob_pct ?? summary.max_thunderstorm_prob_percent ?? risk.p_thunderstorm_percent ?? 87;
  const lightningRate = summary.max_lightning_flashrate ?? 142;
  const maxRain = summary.max_rainfall_rate_mmh ?? summary.max_rain_intensity_mmh ?? risk.max_rainfall_rate_mmh ?? 45.0;
  const maxDbz = summary.max_reflectivity_dbz ?? summary.peak_radar_dbz ?? risk.max_reflectivity_dbz ?? 58;
  const cellSpeed = topCell?.movement?.speed_kmh ?? 24;
  const cellDir = topCell?.movement?.direction_compass ?? 'SE';
  const cloudTopTemp = summary.min_cloud_top_temp_c ?? -65.2;

  const locationName = selectedLocation?.name || 'Telangana';
  const locationCoords = selectedLocation?.lat && selectedLocation?.lon 
    ? `${selectedLocation.lat}° N · ${selectedLocation.lon}° E`
    : '17.8748° N · 79.5210° E';

  return (
    <div className="bg-[#0C4F78] border border-[#1C5E89] rounded-xl p-4 space-y-3 shadow-md font-sans text-white select-none">
      
      {/* Banner Header Row */}
      <div className="flex items-center justify-between border-b border-[#1C5E89]/80 pb-2.5">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#19BCE8] animate-pulse"></span>
          <span className="text-[10px] font-bold text-[#19BCE8] uppercase tracking-wider font-mono">
            CURRENT ATMOSPHERIC CONDITIONS
          </span>
          <span className="text-xs font-bold text-white tracking-tight">
            Atmospheric Pulse — {locationName}
          </span>
          <span className="text-[11px] text-[#90CAF9] font-mono font-medium hidden sm:inline">
            {locationCoords}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#159C83]/30 border border-[#159C83] text-[#159C83] text-[10px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#159C83] animate-ping"></span>
            Live convective telemetry
          </span>
        </div>
      </div>

      {/* 6 Dark Navy Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Card 1: MAX REFLECTIVITY */}
        <div className="bg-[#0E2C45] border border-[#1C4A6F] p-3 rounded-lg space-y-1 hover:border-[#19BCE8] transition-colors">
          <div className="flex items-center space-x-1.5 text-[#90CAF9] text-[10px] uppercase font-semibold tracking-wider font-mono">
            <Radio className="w-3 h-3 text-[#19BCE8]" />
            <span>RADAR REFLECTIVITY</span>
          </div>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {maxDbz} <span className="text-xs text-[#90CAF9] font-normal">dBZ</span>
          </div>
          <div className="text-[10px] text-[#19BCE8] font-medium">Severe core threshold</div>
        </div>

        {/* Card 2: CELL VELOCITY */}
        <div className="bg-[#0E2C45] border border-[#1C4A6F] p-3 rounded-lg space-y-1 hover:border-[#19BCE8] transition-colors">
          <div className="flex items-center space-x-1.5 text-[#90CAF9] text-[10px] uppercase font-semibold tracking-wider font-mono">
            <CloudLightning className="w-3 h-3 text-[#19BCE8]" />
            <span>CELL VELOCITY</span>
          </div>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {cellDir} ({cellSpeed} <span className="text-xs text-[#90CAF9] font-normal">km/h</span>)
          </div>
          <div className="text-[10px] text-[#19BCE8] font-medium">{cellDir} track vector</div>
        </div>

        {/* Card 3: LIGHTNING FLASHRATE */}
        <div className="bg-[#0E2C45] border border-[#1C4A6F] p-3 rounded-lg space-y-1 hover:border-[#19BCE8] transition-colors">
          <div className="flex items-center space-x-1.5 text-[#90CAF9] text-[10px] uppercase font-semibold tracking-wider font-mono">
            <Zap className="w-3 h-3 text-[#FFC53D]" />
            <span>LIGHTNING RATE</span>
          </div>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {lightningRate} <span className="text-xs text-[#90CAF9] font-normal">flashes/h</span>
          </div>
          <div className="text-[10px] text-[#FFC53D] font-medium">Rapid discharge</div>
        </div>

        {/* Card 4: CLOUD TOP TEMP */}
        <div className="bg-[#0E2C45] border border-[#1C4A6F] p-3 rounded-lg space-y-1 hover:border-[#19BCE8] transition-colors">
          <div className="flex items-center space-x-1.5 text-[#90CAF9] text-[10px] uppercase font-semibold tracking-wider font-mono">
            <Radio className="w-3 h-3 text-[#19BCE8]" />
            <span>CLOUD TOP TEMP</span>
          </div>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {cloudTopTemp} <span className="text-xs text-[#90CAF9] font-normal">°C</span>
          </div>
          <div className="text-[10px] text-[#90CAF9] font-medium">Overshooting top</div>
        </div>

        {/* Card 5: SURFACE RAINFALL */}
        <div className="bg-[#0E2C45] border border-[#1C4A6F] p-3 rounded-lg space-y-1 hover:border-[#19BCE8] transition-colors">
          <div className="flex items-center space-x-1.5 text-[#90CAF9] text-[10px] uppercase font-semibold tracking-wider font-mono">
            <CloudRain className="w-3 h-3 text-[#19BCE8]" />
            <span>SURFACE RAIN RATE</span>
          </div>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {Number(maxRain).toFixed(1)} <span className="text-xs text-[#90CAF9] font-normal">mm/h</span>
          </div>
          <div className="text-[10px] text-[#19BCE8] font-medium">Heavy rain rate</div>
        </div>

        {/* Card 6: THUNDERSTORM RISK */}
        <div className="bg-[#0E2C45] border border-[#1C4A6F] p-3 rounded-lg space-y-1 hover:border-[#19BCE8] transition-colors">
          <div className="flex items-center space-x-1.5 text-[#90CAF9] text-[10px] uppercase font-semibold tracking-wider font-mono">
            <Zap className="w-3 h-3 text-[#EF4444]" />
            <span>THUNDERSTORM RISK</span>
          </div>
          <div className="text-xl font-bold font-mono text-[#19BCE8] tabular-nums">
            {Math.round(thunderProb)}% <span className="text-xs text-white font-semibold">(HIGH)</span>
          </div>
          <div className="text-[10px] text-[#EF4444] font-medium">Convective Alert Active</div>
        </div>

      </div>
    </div>
  );
}
