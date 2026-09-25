import React from 'react';
import { 
  MapPin, 
  CloudLightning, 
  Zap, 
  Wind, 
  Clock, 
  Info, 
  Sparkles
} from 'lucide-react';

export default function RightPanel({
  xaiData,
  selectedCell,
  summaryMetrics,
  selectedLocation
}) {
  const pThunder = summaryMetrics?.max_thunderstorm_prob_percent ?? xaiData?.p_thunderstorm_percent ?? 87.0;
  const pLightning = summaryMetrics?.max_lightning_prob_percent ?? xaiData?.p_lightning_percent ?? 92.0;

  const drivers = xaiData?.drivers || [
    { feature: "Radar Reflectivity", value: "High", impact_percent: 92, status: "CRITICAL" },
    { feature: "Lightning Activity", value: "Very High", impact_percent: 95, status: "CRITICAL" },
    { feature: "Cloud Top Temperature", value: "High", impact_percent: 85, status: "CRITICAL" },
    { feature: "CAPE (Instability)", value: "High", impact_percent: 80, status: "HIGH" },
    { feature: "Humidity", value: "Moderate", impact_percent: 60, status: "MODERATE" },
    { feature: "Wind Shear", value: "Low-Moderate", impact_percent: 45, status: "FAVORABLE" }
  ];

  const rationale = xaiData?.meteorological_rationale || 
    "Rapid increase in radar reflectivity and lightning activity, combined with unstable atmospheric conditions and cooling cloud tops, indicates a high probability of thunderstorm intensification over the target region.";

  const cellMotion = selectedCell?.movement ? `${selectedCell.movement.direction_compass} → ${selectedCell.movement.speed_kmh} km/h` : 'SE → 24 km/h';

  return (
    <div className="bg-[#0B101D] p-3.5 rounded-2xl border border-slate-800 shadow-xl flex flex-col space-y-4 text-slate-200 text-xs">
      {/* 1. SELECTED LOCATION */}
      <div className="pb-2.5 border-b border-slate-800">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
          SELECTED LOCATION
        </span>
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-red-500 fill-red-500/20" />
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              {selectedLocation?.name || 'Hyderabad, Telangana'}
            </h3>
            <span className="text-[10px] font-mono text-slate-400">
              {selectedLocation?.lat || '17.3850'}° N, {selectedLocation?.lon || '78.4867'}° E
            </span>
          </div>
        </div>
      </div>

      {/* 2. DUAL RISK BOXES */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Thunderstorm Risk */}
        <div className="bg-[#180D15] p-3 rounded-xl border border-red-900/60 flex items-center space-x-3 shadow-inner">
          <div className="p-2 rounded-lg bg-red-500/20 text-red-400">
            <CloudLightning className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-red-400 uppercase tracking-wider block font-mono">
              THUNDERSTORM RISK
            </span>
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {pThunder}%
            </span>
          </div>
        </div>

        {/* Lightning Risk */}
        <div className="bg-[#1C160B] p-3 rounded-xl border border-amber-900/60 flex items-center space-x-3 shadow-inner">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
            <Zap className="w-6 h-6 fill-current" />
          </div>
          <div>
            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider block font-mono">
              LIGHTNING RISK
            </span>
            <span className="text-2xl font-bold font-mono text-white tracking-tight">
              {pLightning}%
            </span>
          </div>
        </div>
      </div>

      {/* 3. SUB-METRICS: Expected Onset, Duration, Storm Motion */}
      <div className="grid grid-cols-3 gap-2 bg-[#060913] p-2.5 rounded-xl border border-slate-800 text-[11px] font-mono">
        <div>
          <span className="text-[9px] text-slate-400 block font-sans">Expected Onset</span>
          <span className="font-bold text-amber-400">15 – 30 min</span>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 block font-sans">Expected Duration</span>
          <span className="font-bold text-cyan-400">40 – 70 min</span>
        </div>
        <div>
          <span className="text-[9px] text-slate-400 block font-sans">Storm Motion</span>
          <span className="font-bold text-slate-200 truncate">{cellMotion}</span>
        </div>
      </div>

      {/* 4. AI EXPLANATION */}
      <div className="flex-1 flex flex-col space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            AI EXPLANATION
            <Info className="w-3.5 h-3.5 text-slate-400" />
          </span>
          <span className="text-[10px] text-cyan-400 font-semibold">
            SHAP Attribution
          </span>
        </div>

        {/* Feature Impact Bars */}
        <div className="space-y-1.5">
          {drivers.map((bar, i) => {
            let col = "bg-cyan-500";
            if (bar.impact_percent > 85) col = "bg-red-500";
            else if (bar.impact_percent > 70) col = "bg-orange-500";
            else if (bar.impact_percent > 50) col = "bg-blue-500";

            return (
              <div key={i} className="flex items-center justify-between text-[10px]">
                <span className="text-slate-300 w-36 truncate">{bar.feature}</span>
                <div className="flex-1 mx-2 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className={`${col} h-full rounded-full`} style={{ width: `${bar.impact_percent}%` }}></div>
                </div>
                <span className="font-mono text-slate-400 text-right w-16">{bar.value}</span>
              </div>
            );
          })}
        </div>

        {/* Natural Language AI Summary Box */}
        <div className="bg-[#060913] p-3 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed">
          "{rationale}"
        </div>
      </div>
    </div>
  );
}
