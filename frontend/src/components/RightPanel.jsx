import React from 'react';
import { 
  MapPin, 
  CloudLightning, 
  Zap, 
  Wind, 
  Info, 
  CloudRain,
  Radio,
  Gauge
} from 'lucide-react';

export default function RightPanel({
  xaiData,
  selectedCell,
  summaryMetrics,
  selectedLocation
}) {
  const pThunder = summaryMetrics?.max_thunderstorm_prob_percent ?? xaiData?.p_thunderstorm_percent ?? 87.0;
  const pLightning = summaryMetrics?.max_lightning_prob_percent ?? xaiData?.p_lightning_percent ?? 92.0;
  const maxRain = summaryMetrics?.max_rain_intensity_mmh ?? 45.0;
  const peakDbz = summaryMetrics?.peak_radar_dbz ?? 58.0;
  const confidence = summaryMetrics?.system_confidence_percent ?? 88.5;

  const drivers = xaiData?.drivers || [
    { feature: "Radar Reflectivity (dBZ)", value: `${peakDbz} dBZ`, impact_percent: 92 },
    { feature: "Lightning Flash Rate", value: "High", impact_percent: 95 },
    { feature: "Cloud Top Temp (IR)", value: "Cold (-65°C)", impact_percent: 85 },
    { feature: "CAPE Instability", value: "High", impact_percent: 80 },
    { feature: "Relative Humidity", value: "78%", impact_percent: 60 },
    { feature: "0-6km Wind Shear", value: "22 kts", impact_percent: 45 }
  ];

  const rationale = xaiData?.meteorological_rationale || 
    "ConvLSTM spatiotemporal feature analysis indicates rapid convective core growth, driven by elevated CAPE and radar reflectivity, leading to high probability of severe thunderstorm and lightning activity.";

  const cellMotion = selectedCell?.movement ? `${selectedCell.movement.direction_compass} @ ${selectedCell.movement.speed_kmh} km/h` : 'SE @ 24 km/h';

  return (
    <div className="bg-[#F8FCFE] p-4 rounded-lg border border-[#D0E3F0] shadow-2xs flex flex-col space-y-3.5 text-[#12324E] text-xs font-sans">
      
      {/* 1. SELECTED LOCATION & LIGHTNING JUMP STATUS */}
      <div className="bg-[#EEF6FB] p-3 rounded-md border border-[#D0E3F0] space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#5E82A6] uppercase tracking-wider block font-sans">
            Target Sector
          </span>
          {selectedCell?.is_lightning_jump && (
            <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7] flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#D97706]" />
              LIGHTNING JUMP (+{selectedCell.flash_rate_accel_min2}/min)
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-[#DC2626] shrink-0" />
          <div>
            <h3 className="text-xs font-bold text-[#12324E] font-sora tracking-tight">
              {selectedLocation?.name || 'Hyderabad, Telangana'}
            </h3>
            <span className="text-[10px] font-mono text-[#5E82A6]">
              {selectedLocation?.lat || '17.3850'}° N, {selectedLocation?.lon || '78.4867'}° E
            </span>
          </div>
        </div>
      </div>

      {/* 2. DUAL RISK BOXES */}
      <div className="grid grid-cols-2 gap-2.5 font-mono">
        {/* Thunderstorm Risk */}
        <div className="bg-[#FEF2F2] p-3 rounded-md border border-[#FEE2E2] space-y-1">
          <div className="flex items-center space-x-1.5 text-[#991B1B]">
            <CloudLightning className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider font-sans">
              THUNDERSTORM
            </span>
          </div>
          <div className="text-xl font-bold text-[#991B1B]">
            {pThunder}%
          </div>
        </div>

        {/* Lightning Risk */}
        <div className="bg-[#FFFBEB] p-3 rounded-md border border-[#FEF3C7] space-y-1">
          <div className="flex items-center space-x-1.5 text-[#92400E]">
            <Zap className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider font-sans">
              LIGHTNING
            </span>
          </div>
          <div className="text-xl font-bold text-[#92400E]">
            {pLightning}%
          </div>
        </div>
      </div>

      {/* 3. NOWCAST METRICS */}
      <div className="grid grid-cols-2 gap-2 bg-[#EEF6FB] p-3 rounded-md border border-[#D0E3F0] text-[11px] font-mono">
        <div className="flex items-center space-x-2">
          <CloudRain className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
          <div>
            <span className="text-[9px] text-[#5E82A6] block font-sans">Rainfall</span>
            <span className="font-bold text-[#12324E]">{maxRain} mm/h</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Radio className="w-3.5 h-3.5 text-[#DC2626] shrink-0" />
          <div>
            <span className="text-[9px] text-[#5E82A6] block font-sans">Peak dBZ</span>
            <span className="font-bold text-[#12324E]">{peakDbz} dBZ</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Wind className="w-3.5 h-3.5 text-[#0284C7] shrink-0" />
          <div>
            <span className="text-[9px] text-[#5E82A6] block font-sans">Motion</span>
            <span className="font-bold text-[#12324E] truncate">{cellMotion}</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Gauge className="w-3.5 h-3.5 text-[#047857] shrink-0" />
          <div>
            <span className="text-[9px] text-[#5E82A6] block font-sans">Confidence</span>
            <span className="font-bold text-[#047857]">{confidence}%</span>
          </div>
        </div>
      </div>

      {/* 4. METEOROLOGICAL RATIONALE & DRIVERS */}
      <div className="flex-1 flex flex-col space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-[#12324E] font-sora uppercase tracking-wider flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-[#5E82A6]" />
            Physical Driver Attribution
          </span>
          <span className="text-[10px] text-[#0284C7] font-semibold font-mono">
            SHAP Weight
          </span>
        </div>

        {/* Top Impact Bars */}
        <div className="space-y-1.5">
          {drivers.slice(0, 3).map((bar, i) => (
            <div key={i} className="flex items-center justify-between text-[10px]">
              <span className="text-[#12324E] font-sans w-32 truncate">{bar.feature}</span>
              <div className="flex-1 mx-2 bg-[#E2EAF0] rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    bar.impact_percent > 85 ? 'bg-[#DC2626]' : bar.impact_percent > 70 ? 'bg-[#D97706]' : 'bg-[#0284C7]'
                  }`}
                  style={{ width: `${bar.impact_percent}%` }}
                />
              </div>
              <span className="font-mono text-[#5E82A6] text-right w-16">{bar.value}</span>
            </div>
          ))}
        </div>

        {/* Meteorological Rationale Box */}
        <div className="bg-[#EEF6FB] p-2.5 rounded-md border border-[#D0E3F0] text-[11px] text-[#5E82A6] leading-relaxed italic mt-1 font-sans">
          "{rationale}"
        </div>
      </div>

    </div>
  );
}
